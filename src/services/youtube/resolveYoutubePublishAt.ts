import { VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { futureSchedule, nextYoutubePublishAt } from './publishSchedule';

/**
 * Finds the latest still-pending YouTube publish slot for a website's channel.
 * A job counts as "pending scheduled" when it holds a future youtubePublishAt,
 * has not been published yet, and did not fail rendering.
 */
async function latestPendingYoutubePublishAt(
  websiteId: string,
  now: Date
): Promise<Date | string | null> {
  const { db } = await connectToDatabase();
  const latest = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .find({
      websiteId,
      youtubePublishAt: { $ne: null, $gt: now },
      youtubeStatus: { $ne: 'published' },
      status: { $ne: 'failed' },
    })
    .sort({ youtubePublishAt: -1 })
    .limit(1)
    .next();
  return latest?.youtubePublishAt ?? null;
}

let publishSlotAssignments: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = publishSlotAssignments.then(fn, fn);
  publishSlotAssignments = run.catch(() => {});
  return run;
}

/**
 * Picks the YouTube publish time for a video job.
 *
 * - If `explicitSchedule` is a future date (the product's scheduled WooCommerce
 *   publish time), it is kept unchanged.
 * - Otherwise the job is slotted 5 minutes after the latest pending scheduled
 *   video on the same website/channel, or 5 minutes from now when none exist.
 *
 * The result is persisted by the caller so it stays stable across cron runs
 * and retries.
 */
export async function resolveYoutubePublishAt(
  websiteId: string,
  explicitSchedule?: Date | null,
  now: Date = new Date()
): Promise<Date> {
  const explicit = futureSchedule(explicitSchedule, now);
  if (explicit) return explicit;
  return serialize(async () => {
    const latestPending = await latestPendingYoutubePublishAt(websiteId, now);
    return nextYoutubePublishAt(latestPending, now);
  });
}