import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import {
  REVENUE_NOTIFICATION_STATE_COLLECTION,
  REVENUE_ORDER_NOTIFICATIONS_COLLECTION,
  USERS_COLLECTION,
  WEBSITES_COLLECTION,
} from "@/constant/collections";
import { getErrorMessage, getTelegramError } from "@/lib/error-utils";
import { sendTelegramMessage } from "@/services/telegram/sendTelegramMessage";
import { WooWebsitePayload } from "@/types/woo";
import { createWooClient } from "./loadOrders";
import {
  buildOrderNotificationMessage,
  getLatestOrderCursor,
  ORDER_CURSOR_OVERLAP_MS,
  selectOrdersAfterCursor,
} from "./orderNotificationHelpers";

const NOTIFICATION_LOCK_MS = 5 * 60 * 1000;

let indexesEnsured = false;

export interface OrderNotificationResult {
  discovered: number;
  notified: number;
  failed: number;
}

interface WebsiteNotificationResult extends OrderNotificationResult {
  websiteId: string;
  websiteName: string;
}

async function ensureIndexes(db: any) {
  if (indexesEnsured) return;

  await db
    .collection(REVENUE_NOTIFICATION_STATE_COLLECTION)
    .createIndex({ websiteId: 1 }, { unique: true });

  await db
    .collection(REVENUE_ORDER_NOTIFICATIONS_COLLECTION)
    .createIndex({ websiteId: 1, orderId: 1 }, { unique: true });

  await db
    .collection(REVENUE_ORDER_NOTIFICATIONS_COLLECTION)
    .createIndex({ status: 1, lockedUntil: 1 });

  indexesEnsured = true;
}

/**
 * Establish the per-website baseline on first activation. Returning null tells
 * the caller to skip this website for the current run, so historical orders are
 * never notified.
 */
async function loadOrBaselineState(db: any, websiteId: string) {
  const stateCollection = db.collection(REVENUE_NOTIFICATION_STATE_COLLECTION);
  const state = await stateCollection.findOne({ websiteId });
  const now = new Date();

  if (state) {
    if (Number.isFinite(Date.parse(state.cursor))) {
      return state;
    }

    await stateCollection.updateOne(
      { websiteId },
      {
        $set: {
          cursor: now.toISOString(),
          baselineAt: now,
          updatedAt: now,
        },
      }
    );
    return null;
  }

  await stateCollection.updateOne(
    { websiteId },
    {
      $setOnInsert: {
        websiteId,
        cursor: now.toISOString(),
        baselineAt: now,
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return null;
}

async function fetchOrdersAfter(
  website: WooWebsitePayload,
  after: string
): Promise<any[]> {
  const woo = createWooClient(website);
  const orders: any[] = [];

  for (let page = 1; ; page++) {
    const { data } = await woo.get("/orders", {
      params: {
        after,
        dates_are_gmt: true,
        per_page: 100,
        page,
        orderby: "date",
        order: "asc",
      },
    });

    if (!Array.isArray(data) || data.length === 0) break;

    orders.push(...data);
    if (data.length < 100) break;
  }

  return orders;
}

async function insertPendingNotifications(
  db: any,
  websiteId: string,
  websiteName: string,
  orders: any[]
): Promise<number> {
  if (!orders.length) return 0;

  const now = new Date();
  const operations = orders.map((order) => {
    const orderId = Number(order.id);

    return {
      updateOne: {
        filter: { websiteId, orderId },
        update: {
          $setOnInsert: {
            websiteId,
            orderId,
            status: "pending",
            message: buildOrderNotificationMessage(websiteName, order),
            websiteName,
            orderNumber: order.number ?? order.id ?? "",
            total: Number(order.total || 0),
            currency: order.currency || "",
            paymentMethod:
              order.payment_method_title || order.payment_method || "",
            orderStatus: order.status || "",
            orderCreatedAt:
              order.date_created || order.date_created_gmt || "",
            attempts: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  try {
    const result = await db
      .collection(REVENUE_ORDER_NOTIFICATIONS_COLLECTION)
      .bulkWrite(operations, { ordered: false });

    return result.upsertedCount || 0;
  } catch (err: any) {
    // Another process inserted the same order first; the unique index is the
    // dedupe guard, so a duplicate-key race is not a sync failure.
    const duplicateKey =
      err?.code === 11000 ||
      err?.writeErrors?.every((writeError: any) => writeError?.code === 11000);

    if (duplicateKey) return 0;
    throw err;
  }
}

async function resolveTelegramId(db: any, website: WooWebsitePayload) {
  const emails = [
    website.owner,
    ...(Array.isArray(website.members) ? website.members : []),
  ]
    .filter(Boolean)
    .map(String);

  for (const email of emails) {
    const user = await db.collection(USERS_COLLECTION).findOne({ email });
    if (user?.telegramId) return String(user.telegramId);
  }

  return null;
}

/**
 * Sends pending notifications one at a time. The atomic lock claim ensures
 * overlapping cron runs or multiple PM2 processes cannot send the same order
 * twice; the status only becomes `notified` after Telegram accepts the message.
 */
async function sendPendingNotifications(
  db: any,
  websiteId: string,
  telegramId: string | null
): Promise<OrderNotificationResult> {
  const notifications = db.collection(
    REVENUE_ORDER_NOTIFICATIONS_COLLECTION
  );
  const pending = await notifications
    .find({ websiteId, status: "pending" })
    .sort({ createdAt: 1 })
    .toArray();

  const result: OrderNotificationResult = { discovered: 0, notified: 0, failed: 0 };

  for (const item of pending) {
    if (!telegramId) {
      result.failed++;
      continue;
    }

    const now = new Date();
    const lockToken = randomUUID();

    const claimed = await notifications.findOneAndUpdate(
      {
        _id: item._id,
        status: "pending",
        $or: [
          { lockedUntil: { $exists: false } },
          { lockedUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          lockToken,
          lockedUntil: new Date(now.getTime() + NOTIFICATION_LOCK_MS),
          updatedAt: now,
        },
        $inc: { attempts: 1 },
      },
      { returnDocument: "after" }
    );

    if (!claimed) continue;

    try {
      await sendTelegramMessage({
        telegramId,
        message: String(claimed.message || ""),
      });

      await notifications.updateOne(
        { _id: item._id, status: "pending", lockToken },
        {
          $set: {
            status: "notified",
            notifiedAt: new Date(),
            updatedAt: new Date(),
          },
          $unset: { lockedUntil: "", lockToken: "", lastError: "" },
        }
      );
      result.notified++;
    } catch (err) {
      await notifications.updateOne(
        { _id: item._id, status: "pending", lockToken },
        {
          $set: {
            lastError: getTelegramError(err),
            updatedAt: new Date(),
          },
          $unset: { lockedUntil: "", lockToken: "" },
        }
      );
      result.failed++;
      console.error(
        `[REVENUE] Telegram order notification failed for ${item.websiteName || websiteId} #${item.orderNumber ?? item.orderId}: ${getTelegramError(err)}`
      );
    }
  }

  return result;
}

async function processWebsite(
  db: any,
  website: WooWebsitePayload
): Promise<WebsiteNotificationResult> {
  const websiteId = String((website as any)._id);
  const websiteName = website.shopName || websiteId;

  const state = await loadOrBaselineState(db, websiteId);
  if (!state) {
    return {
      websiteId,
      websiteName,
      discovered: 0,
      notified: 0,
      failed: 0,
    };
  }

  let discovered = 0;

  try {
    const cursorTime = Date.parse(state.cursor);
    const after = new Date(
      cursorTime - ORDER_CURSOR_OVERLAP_MS
    ).toISOString();

    const fetched = await fetchOrdersAfter(website, after);
    const newOrders = selectOrdersAfterCursor(fetched, state.cursor);
    discovered = await insertPendingNotifications(
      db,
      websiteId,
      websiteName,
      newOrders
    );

    const latestCursor = getLatestOrderCursor(fetched, state.cursor);
    const now = new Date();
    await db.collection(REVENUE_NOTIFICATION_STATE_COLLECTION).updateOne(
      { websiteId },
      {
        $max: { cursor: latestCursor },
        $set: { lastSyncAt: now, updatedAt: now },
      }
    );
  } catch (err) {
    // A WooCommerce fetch failure must not stop pending Telegram retries.
    console.error(
      `[REVENUE] Order notification sync failed for ${websiteName}: ${getErrorMessage(err)}`
    );
  }

  const telegramId = await resolveTelegramId(db, website);
  const sent = await sendPendingNotifications(db, websiteId, telegramId);

  return {
    websiteId,
    websiteName,
    discovered,
    notified: sent.notified,
    failed: sent.failed,
  };
}

/**
 * Detect newly created orders for each website and notify Telegram. Called only
 * from the existing Revenue Cron, after the normal revenue sync completes.
 */
export async function processNewOrderNotifications(): Promise<OrderNotificationResult> {
  const { db } = await connectToDatabase();
  await ensureIndexes(db);

  const websites = (await db
    .collection(WEBSITES_COLLECTION)
    .find({})
    .toArray()) as unknown as WooWebsitePayload[];

  const total: OrderNotificationResult = {
    discovered: 0,
    notified: 0,
    failed: 0,
  };

  for (const website of websites) {
    try {
      const result = await processWebsite(db, website);
      total.discovered += result.discovered;
      total.notified += result.notified;
      total.failed += result.failed;

      if (result.discovered || result.notified || result.failed) {
        console.log(
          `[REVENUE] ${result.websiteName}: ${result.discovered} new order(s), ${result.notified} notified, ${result.failed} pending/failed`
        );
      }
    } catch (err) {
      console.error(
        `[REVENUE] Order notification run failed for ${website.shopName || website.url}: ${getErrorMessage(err)}`
      );
    }
  }

  return total;
}
