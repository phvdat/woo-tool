/**
 * Pure quota/failover helpers for multi-project YouTube publishing.
 * No DB and no network access here so this module stays unit-testable.
 */

import {
  YoutubeChannel,
  YoutubeProject,
  YoutubeProjectQuotaState,
  YoutubeQuotaOperation,
  YoutubeWebsiteQuotaBlock,
} from '@/types/youtube';

export const LEGACY_PROJECT_ID = 'default';

const QUOTA_TIME_ZONE = 'America/Los_Angeles';

/**
 * Structured YouTube Data API reasons that mean "this project is out of quota
 * for the current period". Anything else (bad credentials, permissions,
 * network failures) must NOT trigger project failover.
 */
const QUOTA_REASONS = new Set<string>([
  'quotaExceeded',
  'dailyLimitExceeded',
  'rateLimitExceeded',
  'userRateLimitExceeded',
  // The dedicated videos.insert upload quota error.
  'uploadLimitExceeded',
]);

/**
 * Returns the first structured quota reason found on a googleapis error, or
 * null when the error is not a quota exhaustion error. Deliberately reads
 * codes/reasons, not message text.
 */
export function quotaReasonFromError(error: any): string | null {
  const containers: any[] = [
    error,
    error?.response?.data?.error,
    error?.response?.data,
    error?.error,
  ];

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;

    if (typeof container.reason === 'string' && QUOTA_REASONS.has(container.reason)) {
      return container.reason;
    }

    const errors = container.errors;
    if (Array.isArray(errors)) {
      for (const item of errors) {
        if (item && typeof item.reason === 'string' && QUOTA_REASONS.has(item.reason)) {
          return item.reason;
        }
      }
    }
  }

  return null;
}

export function isQuotaExceededError(error: any): boolean {
  return quotaReasonFromError(error) !== null;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const map: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = Number(part.value);
  }

  const asUTC = Date.UTC(
    map.year,
    (map.month || 1) - 1,
    map.day || 1,
    (map.hour || 0) % 24,
    map.minute || 0,
    map.second || 0,
  );
  return asUTC - date.getTime();
}

/**
 * The next instant a YouTube Data API quota resets: midnight in the Pacific
 * timezone. Different projects share this reset instant, but quota state is
 * tracked per project so an exhausted project is skipped until then.
 */
export function nextYoutubeQuotaReset(
  now: Date = new Date(),
  timeZone: string = QUOTA_TIME_ZONE,
): Date {
  const offset = timeZoneOffsetMs(now, timeZone);
  const local = new Date(now.getTime() + offset);
  const nextMidnightWall = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
    0,
    0,
    0,
  );
  const guess = new Date(nextMidnightWall);
  const guessOffset = timeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - guessOffset);
}

function isExhausted(
  state: Pick<YoutubeProjectQuotaState, 'projectId' | 'operation' | 'exhaustedUntil'>,
  projectId: string,
  operation: YoutubeQuotaOperation,
  now: Date,
): boolean {
  if (state.projectId !== projectId || state.operation !== operation) return false;
  const until = new Date(state.exhaustedUntil).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

/**
 * Projects that can still serve `operation` at `now`, preserving input order.
 */
export function selectAvailableProjects(
  projects: YoutubeProject[],
  states: Pick<YoutubeProjectQuotaState, 'projectId' | 'operation' | 'exhaustedUntil'>[],
  operation: YoutubeQuotaOperation,
  now: Date = new Date(),
): YoutubeProject[] {
  return projects.filter(
    (project) => !states.some((state) => isExhausted(state, project.projectId, operation, now)),
  );
}

export function allProjectsExhausted(
  projects: YoutubeProject[],
  states: Pick<YoutubeProjectQuotaState, 'projectId' | 'operation' | 'exhaustedUntil'>[],
  operation: YoutubeQuotaOperation,
  now: Date = new Date(),
): boolean {
  return projects.length > 0 && selectAvailableProjects(projects, states, operation, now).length === 0;
}

/**
 * Reads either the multi-project (`projects[]`) or the legacy single-project
 * document shape into a normalized project list. Never mixes tokens: each
 * project keeps its own credentials.
 */
export function normalizeProjects(
  channel: Partial<YoutubeChannel> | null | undefined,
): YoutubeProject[] {
  if (!channel) return [];

  const stored = Array.isArray(channel.projects) ? channel.projects : [];
  const valid = stored.filter(
    (project): project is YoutubeProject =>
      Boolean(project && project.projectId && (project.clientId || project.refreshTokenEncrypted)),
  );
  if (valid.length > 0) {
    return valid.map((project) => ({ ...project }));
  }

  if (channel.clientId || channel.refreshTokenEncrypted) {
    return [
      {
        projectId: LEGACY_PROJECT_ID,
        label: 'Default',
        clientId: channel.clientId || '',
        clientSecretEncrypted: channel.clientSecretEncrypted || '',
        refreshTokenEncrypted: channel.refreshTokenEncrypted || '',
        channelId: channel.channelId || '',
        channelTitle: channel.channelTitle || '',
        connectedByEmail: channel.connectedByEmail || '',
        createdAt: channel.createdAt || new Date(0),
        updatedAt: channel.updatedAt || new Date(0),
      },
    ];
  }

  return [];
}

/**
 * Dedupes the "all projects out of quota" notification: a still-active block
 * that was already notified must not notify again. A new/expired block period
 * notifies once.
 */
export function shouldNotifyQuotaBlock(
  block: Pick<YoutubeWebsiteQuotaBlock, 'blockedUntil' | 'notifiedAt'> | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!block) return true;
  const stillBlocked = new Date(block.blockedUntil).getTime() > now.getTime();
  if (!stillBlocked) return true;
  return !block.notifiedAt;
}

export function buildQuotaBlockMessage(params: {
  shopName: string;
  projects: string[];
  reason: string;
  resetAt?: Date;
}): string {
  const projectList = params.projects.length > 0 ? params.projects.join(', ') : 'Unknown';
  const resetLine = params.resetAt
    ? `\nReset: ${params.resetAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
    : '';
  return `<b>YouTube Quota Exhausted</b>\n\nWebsite: ${params.shopName}\nProjects: ${projectList}\nReason: ${params.reason}${resetLine}\n\nAll YouTube tasks for this website are paused until the quota resets.`;
}

export type FailoverUploadResult =
  | { ok: true; videoId: string; project: YoutubeProject }
  | { ok: false; reason: string };

/**
 * Tries each available project for an upload in order. A quota error marks the
 * project exhausted and moves to the next; any other error stops immediately
 * (no failover for auth/permission/network failures). When every project hits
 * quota it returns `{ ok: false }` so the caller can pause the website.
 *
 * Side-effect callbacks keep this module pure and unit-testable while the
 * caller owns client creation and persistence.
 */
export async function uploadWithProjectFailover(params: {
  availableProjects: YoutubeProject[];
  upload: (project: YoutubeProject) => Promise<string>;
  markExhausted: (project: YoutubeProject, reason: string) => Promise<void>;
}): Promise<FailoverUploadResult> {
  let lastReason = 'quotaExceeded';

  for (const project of params.availableProjects) {
    try {
      const videoId = await params.upload(project);
      return { ok: true, videoId, project };
    } catch (error) {
      const reason = quotaReasonFromError(error);
      if (!reason) throw error;
      lastReason = reason;
      await params.markExhausted(project, reason);
    }
  }

  return { ok: false, reason: lastReason };
}

/**
 * Serializes work per website so concurrent publishers cannot both pick and
 * exhaust the same project, and cannot bypass the website pause. Single
 * process only, matching the deployment model.
 */
const siteLocks = new Map<string, Promise<unknown>>();

export function withSiteLock<T>(siteId: string, fn: () => Promise<T>): Promise<T> {
  const previous = siteLocks.get(siteId) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  siteLocks.set(
    siteId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

/**
 * Serializes channel-config writes per website (save credentials, connect,
 * disconnect) so two concurrent writes cannot drop a project: every write is a
 * read-modify-write of the same `youtubeChannels` document.
 *
 * Deliberately a separate lock from `withSiteLock`, which is held for the
 * whole duration of a video upload and must not make a settings save wait.
 */
const channelLocks = new Map<string, Promise<unknown>>();

export function withChannelLock<T>(siteId: string, fn: () => Promise<T>): Promise<T> {
  const previous = channelLocks.get(siteId) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  channelLocks.set(
    siteId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}
