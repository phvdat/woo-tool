import { connectToDatabase } from "@/lib/mongodb";
import { REVENUE_HISTORY_COLLECTION } from "@/constant/collections";
import { RevenueHistoryRecord } from "@/types/revenue";

/**
 * The `websiteId + orderId` unique index guarantees that re-running the sync
 * (cron overlapping, or a manual Refresh) can never produce duplicate rows.
 * It is created lazily once per process and never dropped, so history survives
 * website deletion.
 */
let uniqueIndexEnsured = false;

async function ensureUniqueIndex() {
  if (uniqueIndexEnsured) return;

  const { db } = await connectToDatabase();
  await db
    .collection(REVENUE_HISTORY_COLLECTION)
    .createIndex({ websiteId: 1, orderId: 1 }, { unique: true });

  uniqueIndexEnsured = true;
}

export interface SaveRevenueHistoryResult {
  upserted: number;
  modified: number;
  skipped: number;
}

/**
 * Upsert built revenue records into the history collection.
 *
 * Each record is matched on `{ websiteId, orderId }`; existing rows have their
 * revenue fields refreshed, new rows are inserted. Running this repeatedly with
 * the same input is therefore idempotent.
 */
export async function saveRevenueHistory(
  records: any[]
): Promise<SaveRevenueHistoryResult> {
  const valid = records.filter(
    (record) => record?.websiteId && record?.id !== undefined && record?.id !== null
  );

  const result: SaveRevenueHistoryResult = {
    upserted: 0,
    modified: 0,
    skipped: records.length - valid.length,
  };

  if (!valid.length) {
    return result;
  }

  await ensureUniqueIndex();

  const { db } = await connectToDatabase();
  const now = new Date();

  const operations = valid.map((record) => {
    const data = {
      websiteId: record.websiteId,
      ownerEmail: String(record.ownerEmail || "").toLowerCase(),
      orderId: Number(record.id),
      website: record.website,
      customer: record.customer,
      total: Number(record.total || 0),
      refunded: Number(record.refunded || 0),
      revenue: Number(record.revenue || 0),
      fee: Number(record.fee || 0),
      net: Number(record.net || 0),
      status: record.status,
      date: record.date,
      paymentMethod: record.paymentMethod,
    };

    return {
      updateOne: {
        filter: { websiteId: data.websiteId, orderId: data.orderId },
        update: {
          $set: { ...data, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    };
  });

  const bulk = await db
    .collection(REVENUE_HISTORY_COLLECTION)
    .bulkWrite(operations as any, { ordered: false });

  result.upserted = bulk.upsertedCount || 0;
  result.modified = bulk.modifiedCount || 0;

  return result;
}

export interface FindRevenueHistoryParams {
  /** Single website filter coming from the client; must be access-checked. */
  websiteId?: string;
  userEmail: string;
  /** Website ids the user owns or is a member of. */
  websiteIds: string[];
  from?: string;
  to?: string;
}

/**
 * Read persisted revenue history, oldest first.
 *
 * Access is resolved by the caller from the `websites` collection (owner or
 * member) and passed in as `websiteIds`; this collection never stores
 * permissions itself.
 *
 * The `ownerEmail` arm only applies to the unfiltered "all websites" view. It
 * keeps revenue readable for websites that were deleted, since a deleted
 * website can no longer appear in `websiteIds`. A client-supplied `websiteId`
 * is always intersected with `websiteIds` first, so a member cannot read a
 * website they have no access to by passing its id directly.
 *
 * `date` is stored as the raw WooCommerce `date_created` string, and those
 * strings are fixed-width ISO-8601, so lexicographic comparison is equivalent
 * to chronological comparison.
 */
export async function findRevenueHistory({
  websiteId,
  userEmail,
  websiteIds,
  from,
  to,
}: FindRevenueHistoryParams): Promise<RevenueHistoryRecord[]> {
  const accessible = websiteIds ?? [];
  const isSingleWebsite = Boolean(websiteId) && websiteId !== "all";

  let filter: any;

  if (isSingleWebsite) {
    if (!accessible.includes(websiteId!)) {
      return [];
    }

    filter = { websiteId };
  } else {
    filter = {
      $or: [
        { websiteId: { $in: accessible } },
        { ownerEmail: userEmail.toLowerCase() },
      ],
    };
  }

  if (from || to) {
    filter.date = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const { db } = await connectToDatabase();

  return db
    .collection<RevenueHistoryRecord>(REVENUE_HISTORY_COLLECTION)
    .find(filter)
    .sort({ date: 1 })
    .toArray();
}
