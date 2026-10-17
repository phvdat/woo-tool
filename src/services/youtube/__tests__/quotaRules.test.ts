import { describe, expect, it } from 'vitest';
import {
  allProjectsExhausted,
  buildQuotaBlockMessage,
  isQuotaExceededError,
  LEGACY_PROJECT_ID,
  nextYoutubeQuotaReset,
  normalizeProjects,
  quotaReasonFromError,
  selectAvailableProjects,
  shouldNotifyQuotaBlock,
} from '../quotaRules';
import { YoutubeChannel, YoutubeProject } from '@/types/youtube';

function project(projectId: string, overrides: Partial<YoutubeProject> = {}): YoutubeProject {
  return {
    projectId,
    clientId: `client-${projectId}`,
    clientSecretEncrypted: `secret-${projectId}`,
    refreshTokenEncrypted: `refresh-${projectId}`,
    channelId: `channel-${projectId}`,
    channelTitle: `Channel ${projectId}`,
    connectedByEmail: 'owner@example.com',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function state(projectId: string, operation: string, exhaustedUntil: string) {
  return { projectId, operation: operation as any, exhaustedUntil: new Date(exhaustedUntil) };
}

describe('quotaReasonFromError', () => {
  it('detects googleapis quotaExceeded with a 403', () => {
    const error = { code: 403, errors: [{ reason: 'quotaExceeded' }] };
    expect(quotaReasonFromError(error)).toBe('quotaExceeded');
    expect(isQuotaExceededError(error)).toBe(true);
  });

  it('detects the dedicated videos.insert upload quota error', () => {
    const error = { code: 403, errors: [{ reason: 'uploadLimitExceeded' }] };
    expect(quotaReasonFromError(error)).toBe('uploadLimitExceeded');
  });

  it('detects rateLimitExceeded and userRateLimitExceeded', () => {
    expect(quotaReasonFromError({ errors: [{ reason: 'rateLimitExceeded' }] })).toBe('rateLimitExceeded');
    expect(quotaReasonFromError({ errors: [{ reason: 'userRateLimitExceeded' }] })).toBe('userRateLimitExceeded');
  });

  it('detects nested axios response.data.error shapes', () => {
    const error = { response: { data: { error: { errors: [{ reason: 'quotaExceeded' }] } } } };
    expect(quotaReasonFromError(error)).toBe('quotaExceeded');
  });

  it('ignores unrelated errors (auth, permission, network)', () => {
    expect(quotaReasonFromError({ code: 401, errors: [{ reason: 'authError' }] })).toBeNull();
    expect(quotaReasonFromError({ code: 403, errors: [{ reason: 'forbidden' }] })).toBeNull();
    expect(quotaReasonFromError({ code: 403, errors: [{ reason: 'insufficientPermissions' }] })).toBeNull();
    expect(quotaReasonFromError({ code: 500, message: 'ECONNRESET' })).toBeNull();
    expect(quotaReasonFromError(new Error('quota exceeded'))).toBeNull();
    expect(quotaReasonFromError(undefined)).toBeNull();
  });
});

describe('nextYoutubeQuotaReset', () => {
  it('returns the next Pacific midnight (PDT, UTC-7)', () => {
    const now = new Date('2026-10-17T20:00:00.000Z');
    expect(nextYoutubeQuotaReset(now).toISOString()).toBe('2026-10-18T07:00:00.000Z');
  });

  it('returns the next Pacific midnight (PST, UTC-8)', () => {
    const now = new Date('2026-11-01T20:00:00.000Z');
    expect(nextYoutubeQuotaReset(now).toISOString()).toBe('2026-11-02T08:00:00.000Z');
  });

  it('handles the spring DST transition', () => {
    const now = new Date('2026-03-08T20:00:00.000Z');
    expect(nextYoutubeQuotaReset(now).toISOString()).toBe('2026-03-09T07:00:00.000Z');
  });

  it('rolls to the next day when now is exactly midnight PT', () => {
    const now = new Date('2026-10-18T07:00:00.000Z');
    expect(nextYoutubeQuotaReset(now).toISOString()).toBe('2026-10-19T07:00:00.000Z');
  });
});

describe('selectAvailableProjects / failover ordering', () => {
  const now = new Date('2026-10-17T12:00:00.000Z');
  const projects = [project('a'), project('b'), project('c')];

  it('returns every project when no quota state exists', () => {
    expect(selectAvailableProjects(projects, [], 'videos.insert', now).map((p) => p.projectId)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('skips an exhausted project and preserves the rest in order', () => {
    const states = [state('a', 'videos.insert', '2026-10-18T07:00:00.000Z')];
    expect(selectAvailableProjects(projects, states, 'videos.insert', now).map((p) => p.projectId)).toEqual([
      'b',
      'c',
    ]);
  });

  it('re-includes a project after its exhaustedUntil passes', () => {
    const states = [state('a', 'videos.insert', '2026-10-17T11:00:00.000Z')];
    expect(selectAvailableProjects(projects, states, 'videos.insert', now).map((p) => p.projectId)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('treats quota as per-operation: comment exhaustion does not block uploads', () => {
    const states = [state('a', 'commentThreads.insert', '2026-10-18T07:00:00.000Z')];
    expect(selectAvailableProjects(projects, states, 'videos.insert', now).map((p) => p.projectId)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(
      selectAvailableProjects(projects, states, 'commentThreads.insert', now).map((p) => p.projectId),
    ).toEqual(['b', 'c']);
  });

  it('allProjectsExhausted is true only when every project is out for the operation', () => {
    const partial = [state('a', 'videos.insert', '2026-10-18T07:00:00.000Z')];
    expect(allProjectsExhausted(projects, partial, 'videos.insert', now)).toBe(false);

    const full = projects.map((p) => state(p.projectId, 'videos.insert', '2026-10-18T07:00:00.000Z'));
    expect(allProjectsExhausted(projects, full, 'videos.insert', now)).toBe(true);
    expect(allProjectsExhausted([], full, 'videos.insert', now)).toBe(false);
  });
});

describe('normalizeProjects', () => {
  it('reads a legacy single-project document', () => {
    const legacy = {
      siteId: 'site-1',
      clientId: 'legacy-client',
      clientSecretEncrypted: 'legacy-secret',
      refreshTokenEncrypted: 'legacy-refresh',
      channelId: 'legacy-channel',
      channelTitle: 'Legacy Channel',
      connectedByEmail: 'owner@example.com',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } as YoutubeChannel;

    const projects = normalizeProjects(legacy);
    expect(projects).toHaveLength(1);
    expect(projects[0].projectId).toBe(LEGACY_PROJECT_ID);
    expect(projects[0].clientId).toBe('legacy-client');
    expect(projects[0].refreshTokenEncrypted).toBe('legacy-refresh');
  });

  it('prefers the stored projects array when present', () => {
    const channel = {
      siteId: 'site-1',
      clientId: 'mirror-client',
      clientSecretEncrypted: 'mirror-secret',
      refreshTokenEncrypted: 'mirror-refresh',
      channelId: '',
      channelTitle: '',
      connectedByEmail: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      projects: [project('p1'), project('p2')],
    } as YoutubeChannel;

    const projects = normalizeProjects(channel);
    expect(projects.map((p) => p.projectId)).toEqual(['p1', 'p2']);
    expect(projects[0].refreshTokenEncrypted).toBe('refresh-p1');
    expect(projects[1].refreshTokenEncrypted).toBe('refresh-p2');
  });

  it('returns nothing for a channel without credentials', () => {
    expect(normalizeProjects(null)).toEqual([]);
    expect(normalizeProjects({ siteId: 'x' } as YoutubeChannel)).toEqual([]);
  });
});

describe('shouldNotifyQuotaBlock', () => {
  const now = new Date('2026-10-17T12:00:00.000Z');

  it('notifies when there is no previous block', () => {
    expect(shouldNotifyQuotaBlock(null, now)).toBe(true);
  });

  it('does not notify again for an active block already notified', () => {
    expect(
      shouldNotifyQuotaBlock(
        { blockedUntil: new Date('2026-10-18T07:00:00Z'), notifiedAt: new Date('2026-10-17T10:00:00Z') },
        now,
      ),
    ).toBe(false);
  });

  it('notifies for an expired block period', () => {
    expect(
      shouldNotifyQuotaBlock(
        { blockedUntil: new Date('2026-10-17T07:00:00Z'), notifiedAt: new Date('2026-10-16T10:00:00Z') },
        now,
      ),
    ).toBe(true);
  });
});

describe('buildQuotaBlockMessage', () => {
  it('includes website, projects and reason', () => {
    const message = buildQuotaBlockMessage({
      shopName: 'My Shop',
      projects: ['Project A', 'Project B'],
      reason: 'quotaExceeded',
      resetAt: new Date('2026-10-18T07:00:00Z'),
    });
    expect(message).toContain('My Shop');
    expect(message).toContain('Project A, Project B');
    expect(message).toContain('quotaExceeded');
  });
});
