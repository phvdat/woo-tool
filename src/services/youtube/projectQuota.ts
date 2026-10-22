/**
 * Persistent quota state, website-level pause, Telegram notification and the
 * per-website lock that keeps overlapping crons from exhausting a project
 * simultaneously. Single-process deployment (see AGENTS.md): the lock is an
 * in-memory promise chain, quota/block state lives in Mongo so it survives
 * restarts.
 */

import {
  USERS_COLLECTION,
  WEBSITES_COLLECTION,
  YOUTUBE_CHANNELS_COLLECTION,
  YOUTUBE_QUOTA_BLOCKS_COLLECTION,
  YOUTUBE_QUOTA_STATE_COLLECTION,
} from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import {
  YoutubeProject,
  YoutubeProjectQuotaState,
  YoutubeQuotaOperation,
  YoutubeWebsiteQuotaBlock,
} from '@/types/youtube';
import { ObjectId } from 'mongodb';
import { sendTelegramMessage } from '@/services/telegram/sendTelegramMessage';
import {
  buildQuotaBlockMessage,
  nextYoutubeQuotaReset,
  normalizeProjects,
  selectAvailableProjects,
  shouldNotifyQuotaBlock,
} from './quotaRules';

export async function getProjectsForSite(siteId: string): Promise<YoutubeProject[]> {
  const { db } = await connectToDatabase();
  const channel = await db.collection(YOUTUBE_CHANNELS_COLLECTION).findOne({ siteId });
  return normalizeProjects(channel as any);
}

export async function getProjectQuotaStates(
  siteId: string,
  operation?: YoutubeQuotaOperation,
): Promise<YoutubeProjectQuotaState[]> {
  const { db } = await connectToDatabase();
  const filter: Record<string, unknown> = { siteId };
  if (operation) filter.operation = operation;
  return db
    .collection<YoutubeProjectQuotaState>(YOUTUBE_QUOTA_STATE_COLLECTION)
    .find(filter)
    .toArray();
}

/** Connected projects that can still serve `operation` at `now`. */
export async function getAvailableProjects(
  siteId: string,
  operation: YoutubeQuotaOperation,
  now: Date = new Date(),
): Promise<YoutubeProject[]> {
  const [projects, states] = await Promise.all([
    getProjectsForSite(siteId),
    getProjectQuotaStates(siteId, operation),
  ]);
  return selectAvailableProjects(
    projects.filter((project) => project.refreshTokenEncrypted),
    states,
    operation,
    now,
  );
}

/**
 * Marks one project exhausted for one operation until the next quota reset.
 * Returns the reset instant. Upsert keyed by (siteId, projectId, operation), so
 * the same project can remain available for other operations and the mark is
 * idempotent across retries.
 */
export async function markProjectQuotaExhausted(
  siteId: string,
  projectId: string,
  operation: YoutubeQuotaOperation,
  reason: string,
  now: Date = new Date(),
): Promise<Date> {
  const { db } = await connectToDatabase();
  const exhaustedUntil = nextYoutubeQuotaReset(now);
  await db.collection<YoutubeProjectQuotaState>(YOUTUBE_QUOTA_STATE_COLLECTION).updateOne(
    { siteId, projectId, operation },
    {
      $set: { siteId, projectId, operation, reason, exhaustedAt: now, exhaustedUntil, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return exhaustedUntil;
}

export async function removeProjectQuotaState(siteId: string, projectId?: string): Promise<void> {
  const { db } = await connectToDatabase();
  const filter: Record<string, unknown> = { siteId };
  if (projectId) filter.projectId = projectId;
  await db.collection(YOUTUBE_QUOTA_STATE_COLLECTION).deleteMany(filter);
}

/** Returns the active website pause, or null when none/expired. */
export async function getWebsiteQuotaBlock(
  siteId: string,
  now: Date = new Date(),
): Promise<YoutubeWebsiteQuotaBlock | null> {
  const { db } = await connectToDatabase();
  const block = await db
    .collection<YoutubeWebsiteQuotaBlock>(YOUTUBE_QUOTA_BLOCKS_COLLECTION)
    .findOne({ siteId });
  if (!block) return null;
  if (new Date(block.blockedUntil).getTime() <= now.getTime()) return null;
  return block;
}

export async function isWebsiteYoutubeBlocked(
  siteId: string,
  now: Date = new Date(),
): Promise<boolean> {
  return (await getWebsiteQuotaBlock(siteId, now)) !== null;
}

/**
 * Marks a website quota-blocked until the next reset and notifies once per
 * blocked period. Keeps the previous `blockedAt` if the block is a continuation
 * so the same period is not re-notified.
 */
export async function blockWebsiteQuota(params: {
  siteId: string;
  projectIds: string[];
  reason: string;
  now?: Date;
}): Promise<{ notified: boolean; blockedUntil: Date }> {
  const { siteId, projectIds, reason } = params;
  const now = params.now ?? new Date();
  const { db } = await connectToDatabase();
  const col = db.collection<YoutubeWebsiteQuotaBlock>(YOUTUBE_QUOTA_BLOCKS_COLLECTION);

  const existing = await col.findOne({ siteId });
  const notify = shouldNotifyQuotaBlock(existing, now);
  const blockedUntil = nextYoutubeQuotaReset(now);

  await col.updateOne(
    { siteId },
    {
      $set: {
        blockedAt: existing?.blockedAt ?? now,
        blockedUntil,
        projects: projectIds,
        reason,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  if (notify) {
    await col.updateOne({ siteId }, { $set: { notifiedAt: now } });
    await notifyQuotaBlock(siteId, projectIds, reason, blockedUntil).catch((error: any) => {
      console.error(`[YOUTUBE QUOTA] Telegram notify failed: ${error?.message || 'Unknown error'}`);
    });
  }

  return { notified: notify, blockedUntil };
}

async function notifyQuotaBlock(
  siteId: string,
  projectIds: string[],
  reason: string,
  blockedUntil: Date,
): Promise<void> {
  const { db } = await connectToDatabase();
  const website = await db
    .collection(WEBSITES_COLLECTION)
    .findOne({ _id: new ObjectId(siteId) });

  const email = website?.members?.[0] || website?.owner;
  if (!email) return;

  const user = await db.collection(USERS_COLLECTION).findOne({ email });
  if (!user?.telegramId) return;

  const channel = await db.collection(YOUTUBE_CHANNELS_COLLECTION).findOne({ siteId });
  const projects = normalizeProjects(channel as any);
  const projectNames = projectIds.map((id) => {
    const project = projects.find((item) => item.projectId === id);
    return project?.label || project?.channelTitle || id;
  });

  await sendTelegramMessage({
    telegramId: user.telegramId,
    message: buildQuotaBlockMessage({
      shopName: website?.shopName || 'Website',
      projects: projectNames,
      reason,
      resetAt: blockedUntil,
    }),
  });
}

/**
 * Serializes work per website so concurrent publishers cannot both pick and
 * exhaust the same project, and cannot bypass the website pause. Single
 * process only, matching the deployment model.
 */
export { withSiteLock } from './quotaRules';

/**
 * Serializes channel-config writes per website so two concurrent saves cannot
 * drop a project. Separate from `withSiteLock`, which is held for the whole
 * duration of a video upload.
 */
export { withChannelLock } from './quotaRules';
