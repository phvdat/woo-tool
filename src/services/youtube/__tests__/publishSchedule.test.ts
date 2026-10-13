import { describe, expect, it } from 'vitest';
import { futureSchedule, nextYoutubePublishAt, YOUTUBE_PUBLISH_GAP_MS } from '../publishSchedule';

const GAP_MINUTES = YOUTUBE_PUBLISH_GAP_MS / 60_000;

describe('futureSchedule', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');

  it('returns the value as a Date when it is in the future', () => {
    const value = new Date('2026-10-13T12:30:00.000Z');
    expect(futureSchedule(value, now)).toBe(value);
  });

  it('returns null for null / undefined / empty', () => {
    expect(futureSchedule(null, now)).toBeNull();
    expect(futureSchedule(undefined, now)).toBeNull();
    expect(futureSchedule('', now)).toBeNull();
  });

  it('returns null for a past date', () => {
    expect(futureSchedule('2026-10-13T11:00:00.000Z', now)).toBeNull();
  });

  it('returns null for an unparseable value', () => {
    expect(futureSchedule('not-a-date', now)).toBeNull();
  });
});

describe('nextYoutubePublishAt', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');

  it('uses now + gap when there is no pending slot', () => {
    const result = nextYoutubePublishAt(null, now);
    expect(result.getTime()).toBe(now.getTime() + GAP_MINUTES * 60_000);
  });

  it('uses latest + gap when a future pending slot exists', () => {
    const latest = new Date('2026-10-13T18:00:00.000Z');
    const result = nextYoutubePublishAt(latest, now);
    expect(result.getTime()).toBe(latest.getTime() + GAP_MINUTES * 60_000);
  });

  it('accepts an ISO string pending slot', () => {
    const result = nextYoutubePublishAt('2026-10-13T18:00:00.000Z', now);
    expect(result.getTime()).toBe(new Date('2026-10-13T18:00:00.000Z').getTime() + GAP_MINUTES * 60_000);
  });

  it('falls back to now + gap when the pending slot is in the past', () => {
    const result = nextYoutubePublishAt('2026-10-13T08:00:00.000Z', now);
    expect(result.getTime()).toBe(now.getTime() + GAP_MINUTES * 60_000);
  });

  it('falls back to now + gap when the pending slot is unparseable', () => {
    const result = nextYoutubePublishAt('garbage', now);
    expect(result.getTime()).toBe(now.getTime() + GAP_MINUTES * 60_000);
  });
});