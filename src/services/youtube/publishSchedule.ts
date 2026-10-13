/**
 * Pure helpers for assigning YouTube publish slots.
 * No DB access here so this module stays unit-testable.
 */

export const YOUTUBE_PUBLISH_GAP_MS = 5 * 60 * 1000;

/**
 * Returns the value as a Date only when it parses to a future date.
 * Past, null, empty and unparseable values yield null. This is the "explicit
 * Schedule" gate: a scheduled product publish stays unchanged, everything else
 * is auto-assigned by the caller.
 */
export function futureSchedule(value: unknown, now: Date = new Date()): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() > now.getTime() ? date : null;
}

/**
 * Computes the next publish slot: `latestPending + GAP`, or `now + GAP` when
 * there is no usable pending slot. Falls back to `now` if the latest pending
 * value is past or unparseable so the result is always in the future.
 */
export function nextYoutubePublishAt(
  latestPending: Date | string | null | undefined,
  now: Date = new Date(),
): Date {
  const base = latestPending ? new Date(latestPending).getTime() : NaN;
  const anchor = Number.isFinite(base) && base > now.getTime() ? base : now.getTime();
  return new Date(anchor + YOUTUBE_PUBLISH_GAP_MS);
}