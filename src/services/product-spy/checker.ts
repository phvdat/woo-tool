import { connectToDatabase } from "@/lib/mongodb";
import {
  SPY_COMPETITORS_COLLECTION,
  SPY_PRODUCTS_COLLECTION,
} from "@/constant/collections";
import { SpyCompetitor } from "@/types/product-spy";
import { fetchProducts } from "./detector";
import { Db, ObjectId } from "mongodb";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildSpyProductIdentity,
  buildSpyProductMatch,
} from "./identity";

const CHECK_LOCK_LEASE_MS = 15 * 60 * 1000;
const CHECK_LOCK_HEARTBEAT_MS = 60 * 1000;

let indexesEnsured = false;

function toCompetitorObjectId(value: unknown): ObjectId | null {
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Unique indexes are the last line of defence. The first one only covers rows
 * written by the new checker (`dedupeKey`), so legacy duplicate rows cannot
 * block its creation. The URL / external id indexes can still fail on legacy
 * duplicates; that is logged instead of deleting data.
 */
async function ensureSpyProductIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;

  const productCol = db.collection(SPY_PRODUCTS_COLLECTION);

  const safeCreate = async (
    index: Record<string, 1 | -1>,
    name: string,
    partialFilterExpression: Record<string, unknown>,
  ) => {
    try {
      await productCol.createIndex(index, {
        name,
        unique: true,
        partialFilterExpression,
      });
    } catch (err) {
      console.error(
        `[PRODUCT-SPY] Could not create index ${name}: ${getErrorMessage(err)}. ` +
          "Existing duplicate rows may need a manual review; inserts still use an atomic upsert.",
      );
    }
  };

  await safeCreate(
    { competitorId: 1, dedupeKey: 1 },
    "uniq_spy_product_competitor_dedupe",
    { dedupeKey: { $type: "string", $gt: "" } },
  );
  await safeCreate(
    { competitorId: 1, normalizedUrl: 1 },
    "uniq_spy_product_competitor_url",
    { normalizedUrl: { $type: "string", $gt: "" } },
  );
  await safeCreate(
    { competitorId: 1, externalId: 1 },
    "uniq_spy_product_competitor_external_id",
    { externalId: { $type: "string", $gt: "" } },
  );

  indexesEnsured = true;
}

/**
 * Cross-process claim so the scheduler and a manual "check now" (or two app
 * instances) cannot crawl the same competitor at the same time. The lease is
 * renewed while the crawl runs and expires automatically if the process dies.
 */
async function claimCompetitorCheck(
  db: Db,
  competitorId: ObjectId,
): Promise<string | null> {
  const now = new Date();
  const owner = new ObjectId().toHexString();

  const claimed = await db.collection(SPY_COMPETITORS_COLLECTION).findOneAndUpdate(
    {
      _id: competitorId,
      $or: [
        { checkLockUntil: { $exists: false } },
        { checkLockUntil: null },
        { checkLockUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        checkLockOwner: owner,
        checkLockUntil: new Date(now.getTime() + CHECK_LOCK_LEASE_MS),
        checkStartedAt: now.toISOString(),
      },
    },
    { returnDocument: "after" },
  );

  return claimed ? owner : null;
}

async function releaseCompetitorCheck(
  db: Db,
  competitorId: ObjectId,
  owner: string,
): Promise<void> {
  await db.collection(SPY_COMPETITORS_COLLECTION).updateOne(
    { _id: competitorId, checkLockOwner: owner },
    {
      $unset: {
        checkLockOwner: "",
        checkLockUntil: "",
        checkStartedAt: "",
      },
    },
  );
}

export async function checkCompetitor(competitor: SpyCompetitor): Promise<void> {
  const { db } = await connectToDatabase();
  const compId = toCompetitorObjectId(competitor._id);

  if (!compId) {
    console.error(
      `[PRODUCT-SPY] Cannot check competitor without a valid id: ${competitor.name}`,
    );
    return;
  }

  const lockOwner = await claimCompetitorCheck(db, compId);
  if (!lockOwner) {
    console.log(
      `[PRODUCT-SPY] Skipped ${competitor.name}: a check is already running`,
    );
    return;
  }

  const competitorCol = db.collection(SPY_COMPETITORS_COLLECTION);
  const heartbeat = setInterval(() => {
    competitorCol
      .updateOne(
        { _id: compId, checkLockOwner: lockOwner },
        { $set: { checkLockUntil: new Date(Date.now() + CHECK_LOCK_LEASE_MS) } },
      )
      .catch(() => undefined);
  }, CHECK_LOCK_HEARTBEAT_MS);
  heartbeat.unref?.();

  try {
    await ensureSpyProductIndexes(db);

    const productCol = db.collection(SPY_PRODUCTS_COLLECTION);

    let isKnown: ((externalId: string) => boolean) | undefined;
    if (competitor.platform === "woocommerce") {
      const knownExternalIds = new Set(
        (
          await productCol
            .find({ competitorId: compId }, { projection: { externalId: 1 } })
            .toArray()
        ).map((d) => d.externalId as string)
      );
      isKnown = (id: string) => knownExternalIds.has(id);
    }

    const { products, debug, hasProducts } = await fetchProducts(
      competitor.url,
      competitor.platform,
      isKnown,
    );

    if (products.length === 0 && !hasProducts) {
      const now = new Date().toISOString();
      const debugInfo = debug.length > 0 ? `\nDebug: ${debug.join("; ")}` : "";
      await competitorCol.updateOne(
        { _id: compId },
        {
          $set: {
            lastCheckAt: now,
            lastStatus: "error",
            lastError: `No products found from this competitor. The crawler may not be able to detect this site's products.${debugInfo}`,
          },
        },
      );
      return;
    }

    let inserted = 0;

    for (const product of products) {
      const identity = buildSpyProductIdentity(product);
      const now = new Date().toISOString();

      const newProduct = {
        competitorId: compId,
        dedupeKey: identity.dedupeKey,
        externalId: identity.externalId,
        normalizedUrl: identity.normalizedUrl,
        title: product.title,
        url: product.url || product.normalizedUrl || "",
        slug: product.slug,
        price: product.price,
        image: product.image,
        images: product.images,
        dateCreated: product.dateCreated,
        source: product.source,
        firstSeenAt: now,
      };

      try {
        const result = await productCol.updateOne(
          buildSpyProductMatch(compId, identity),
          { $setOnInsert: newProduct },
          { upsert: true },
        );
        if (result.upsertedCount > 0) inserted += 1;
      } catch (err) {
        // Two checks raced past the upsert lookup: the unique index rejected
        // the loser. That product already exists, so treat it as a duplicate.
        if (isDuplicateKeyError(err)) continue;
        throw err;
      }
    }

    await competitorCol.updateOne(
      { _id: compId },
      {
        $set: {
          lastCheckAt: new Date().toISOString(),
          lastStatus: "success",
          lastError: null,
        },
      },
    );

    console.log(
      `[PRODUCT-SPY] ${competitor.name}: ${products.length} fetched, ${inserted} new`,
    );
  } catch (err: any) {
    console.error(
      `[PRODUCT-SPY] Check failed for ${competitor.name}: ${getErrorMessage(err)}`,
    );
    await competitorCol
      .updateOne(
        { _id: compId },
        {
          $set: {
            lastCheckAt: new Date().toISOString(),
            lastStatus: "error",
            lastError: err?.message || "Unknown error",
          },
        },
      )
      .catch(() => undefined);
  } finally {
    clearInterval(heartbeat);
    await releaseCompetitorCheck(db, compId, lockOwner).catch(() => undefined);
  }
}

export async function checkAllEnabledCompetitors(): Promise<void> {
  const { db } = await connectToDatabase();
  const competitors = await db
    .collection(SPY_COMPETITORS_COLLECTION)
    .find({ enabled: true })
    .toArray();

  const MAX_CONCURRENT = 3;
  let running = 0;
  const queue: Array<() => void> = [];

  function runNext() {
    if (queue.length === 0 || running >= MAX_CONCURRENT) return;
    running++;
    const next = queue.shift()!;
    next();
  }

  const done = new Promise<void>((resolve) => {
    let completed = 0;
    const total = competitors.length;
    if (total === 0) {
      resolve();
      return;
    }

    for (const comp of competitors) {
      const task = async () => {
        try {
          await checkCompetitor(comp as unknown as SpyCompetitor);
        } finally {
          completed++;
          running--;
          if (completed >= total) {
            resolve();
          } else {
            runNext();
          }
        }
      };
      queue.push(() => {
        task();
      });
    }
    runNext();
  });

  await done;
}
