import { connectToDatabase } from "@/lib/mongodb";
import {
  SPY_COMPETITORS_COLLECTION,
  SPY_PRODUCTS_COLLECTION,
} from "@/constant/collections";
import { SpyCompetitor } from "@/types/product-spy";
import { Db, ObjectId } from "mongodb";
import { getErrorMessage } from "@/lib/error-utils";
import { claimCompetitorCheck, releaseCompetitorCheck } from "./checker";
import {
  classifyFetchError,
  classifyHttpStatus,
  normalizeCompetitorUrl,
  WebsiteCheckStatus,
} from "./websiteStatus";

const WEBSITE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const WEBSITE_CHECK_TIMEOUT_MS = 15 * 1000;
const DEAD_THRESHOLD = 2;
const MAX_CONCURRENT = 3;

export type WebsiteCheckOutcome =
  | "alive"
  | "dead"
  | "unavailable"
  | "blocked"
  | "skipped";

export interface WebsiteCheckResult {
  status: WebsiteCheckOutcome;
  deleted: boolean;
}

export interface WebsiteHealthStats {
  checked: number;
  alive: number;
  dead: number;
  unavailable: number;
  blocked: number;
  deleted: number;
}

export interface WebsiteHealthOptions {
  force?: boolean;
}

let isRunning = false;

function toCompetitorObjectId(value: unknown): ObjectId | null {
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
}

function isWebsiteCheckDue(
  competitor: Pick<SpyCompetitor, "lastCheckedAt">,
  now = Date.now(),
): boolean {
  if (!competitor.lastCheckedAt) return true;

  const last = new Date(competitor.lastCheckedAt).getTime();
  if (Number.isNaN(last)) return true;

  return now - last >= WEBSITE_CHECK_INTERVAL_MS;
}

interface ProbeResult {
  status: WebsiteCheckStatus;
  httpStatus?: number;
  reason?: string;
}

async function probeWebsite(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBSITE_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "user-agent": "WooTool-WebsiteHealth/1.0 (+https://github.com)",
      },
    });

    // The status code is all we need; do not download the page body.
    try {
      await response.body?.cancel();
    } catch {
      // Body may already be closed/consumed.
    }

    return {
      status: classifyHttpStatus(response.status),
      httpStatus: response.status,
    };
  } catch (error) {
    return {
      status: classifyFetchError(error),
      reason: getErrorMessage(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function removeDeadCompetitor(
  db: Db,
  competitorId: ObjectId,
  name: string,
  deadCount: number,
): Promise<void> {
  await db
    .collection(SPY_COMPETITORS_COLLECTION)
    .deleteOne({ _id: competitorId });
  await db
    .collection(SPY_PRODUCTS_COLLECTION)
    .deleteMany({ competitorId });

  console.log(
    `[PRODUCT-SPY] Removed dead competitor "${name}" after ${deadCount} consecutive dead checks`,
  );
}

export async function checkCompetitorWebsite(
  competitor: SpyCompetitor,
  options: WebsiteHealthOptions = {},
): Promise<WebsiteCheckResult> {
  const { db } = await connectToDatabase();
  const compId = toCompetitorObjectId(competitor._id);

  if (!compId) {
    console.error(
      `[PRODUCT-SPY] Cannot check website without a valid id: ${competitor.name}`,
    );
    return { status: "skipped", deleted: false };
  }

  const lockOwner = await claimCompetitorCheck(db, compId);
  if (!lockOwner) {
    console.log(
      `[PRODUCT-SPY] Skipped website check for ${competitor.name}: a check is already running`,
    );
    return { status: "blocked", deleted: false };
  }

  try {
    const competitorCol = db.collection(SPY_COMPETITORS_COLLECTION);

    // Re-read after claiming the lease: another instance may have finished a
    // daily check between the scheduler's query and our claim.
    const fresh = await competitorCol.findOne({ _id: compId });
    if (!fresh || fresh.enabled === false) {
      return { status: "skipped", deleted: false };
    }
    if (!options.force && !isWebsiteCheckDue(fresh as unknown as SpyCompetitor)) {
      return { status: "skipped", deleted: false };
    }

    const url = normalizeCompetitorUrl(
      typeof fresh.url === "string" ? fresh.url : "",
    );
    const now = new Date().toISOString();

    const result: ProbeResult = url
      ? await probeWebsite(url)
      : { status: "dead", reason: "Invalid competitor URL" };

    if (result.status === "alive") {
      await competitorCol.updateOne(
        { _id: compId },
        {
          $set: {
            deadCount: 0,
            lastCheckedAt: now,
            lastAliveAt: now,
            lastCheckStatus: "alive",
          },
        },
      );
      return { status: "alive", deleted: false };
    }

    if (result.status === "unavailable") {
      await competitorCol.updateOne(
        { _id: compId },
        {
          $set: {
            lastCheckedAt: now,
            lastCheckStatus: "unavailable",
          },
        },
      );
      console.log(
        `[PRODUCT-SPY] ${fresh.name} is temporarily unavailable${
          result.reason ? `: ${result.reason}` : ""
        }`,
      );
      return { status: "unavailable", deleted: false };
    }

    const updated = await competitorCol.findOneAndUpdate(
      { _id: compId },
      {
        $inc: { deadCount: 1 },
        $set: {
          lastCheckedAt: now,
          lastCheckStatus: "dead",
        },
      },
      { returnDocument: "after" },
    );

    const deadCount =
      typeof updated?.deadCount === "number" ? updated.deadCount : 1;

    if (deadCount >= DEAD_THRESHOLD) {
      await removeDeadCompetitor(db, compId, fresh.name, deadCount);
      return { status: "dead", deleted: true };
    }

    console.log(
      `[PRODUCT-SPY] ${fresh.name} looks dead (${deadCount}/${DEAD_THRESHOLD})${
        result.httpStatus ? ` [HTTP ${result.httpStatus}]` : ""
      }${result.reason ? `: ${result.reason}` : ""}`,
    );
    return { status: "dead", deleted: false };
  } catch (err) {
    console.error(
      `[PRODUCT-SPY] Website check failed for ${competitor.name}: ${getErrorMessage(err)}`,
    );
    return { status: "skipped", deleted: false };
  } finally {
    // A deleted competitor no longer matches, so this is a safe no-op then.
    await releaseCompetitorCheck(db, compId, lockOwner).catch(() => undefined);
  }
}

function createEmptyStats(): WebsiteHealthStats {
  return {
    checked: 0,
    alive: 0,
    dead: 0,
    unavailable: 0,
    blocked: 0,
    deleted: 0,
  };
}

function logStats(stats: WebsiteHealthStats, force: boolean): void {
  console.log(
    `[PRODUCT-SPY] Website health summary${force ? " (initial run)" : ""}: ` +
      `checked=${stats.checked}, alive=${stats.alive}, dead=${stats.dead}, ` +
      `unavailable=${stats.unavailable}, blocked=${stats.blocked}, ` +
      `deleted=${stats.deleted}`,
  );
}

/**
 * One-off startup pass. Unlike the scheduled run it ignores the 24-hour
 * `lastCheckedAt` window, but it still uses the per-competitor DB lease and
 * updates `lastCheckedAt`, so it neither overlaps a crawl nor causes the next
 * scheduled check to run immediately afterwards.
 */
export async function runInitialWebsiteHealthChecks(): Promise<WebsiteHealthStats> {
  return runWebsiteHealthChecks(undefined, { force: true });
}

export async function runWebsiteHealthChecks(
  preloadedCompetitors?: SpyCompetitor[],
  options: WebsiteHealthOptions = {},
): Promise<WebsiteHealthStats> {
  const stats = createEmptyStats();
  if (isRunning) return stats;
  isRunning = true;

  try {
    let competitors: SpyCompetitor[];
    if (preloadedCompetitors) {
      competitors = preloadedCompetitors;
    } else {
      const { db } = await connectToDatabase();
      competitors = (await db
        .collection(SPY_COMPETITORS_COLLECTION)
        .find({ enabled: true })
        .toArray()) as unknown as SpyCompetitor[];
    }

    const now = Date.now();
    const due = options.force
      ? competitors
      : competitors.filter((comp) =>
          isWebsiteCheckDue(comp as unknown as SpyCompetitor, now),
        );

    if (due.length === 0) {
      if (options.force) logStats(stats, true);
      return stats;
    }

    stats.checked = due.length;

    console.log(
      `[PRODUCT-SPY] Website health: checking ${due.length} competitor(s)${
        options.force ? " (initial run)" : ""
      }`,
    );

    let running = 0;
    const queue: Array<() => void> = [];

    const done = new Promise<void>((resolve) => {
      let completed = 0;
      const total = due.length;

      function runNext() {
        if (queue.length === 0 || running >= MAX_CONCURRENT) return;
        running++;
        const next = queue.shift()!;
        next();
      }

      for (const comp of due) {
        queue.push(async () => {
          try {
            const result = await checkCompetitorWebsite(
              comp as unknown as SpyCompetitor,
              options,
            );

            if (result.status === "alive") stats.alive++;
            else if (result.status === "dead") stats.dead++;
            else if (result.status === "unavailable") stats.unavailable++;
            else if (result.status === "blocked") stats.blocked++;

            if (result.deleted) stats.deleted++;
          } finally {
            completed++;
            running--;
            if (completed >= total) {
              resolve();
            } else {
              runNext();
            }
          }
        });
      }

      runNext();
    });

    await done;
    logStats(stats, Boolean(options.force));
    return stats;
  } catch (err) {
    console.error(
      `[PRODUCT-SPY] Website health run failed: ${getErrorMessage(err)}`,
    );
    return stats;
  } finally {
    isRunning = false;
  }
}
