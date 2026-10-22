import { describe, expect, it, vi } from 'vitest';
import { uploadWithProjectFailover, withChannelLock, withSiteLock } from '../quotaRules';
import { YoutubeProject } from '@/types/youtube';

function project(projectId: string): YoutubeProject {
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
  };
}

const quotaError = { code: 403, errors: [{ reason: 'quotaExceeded' }] };
const uploadLimitError = { code: 403, errors: [{ reason: 'uploadLimitExceeded' }] };
const authError = { code: 401, errors: [{ reason: 'authError' }] };

describe('uploadWithProjectFailover', () => {
  it('fails over to the next project when one is out of quota', async () => {
    const projects = [project('a'), project('b')];
    const upload = vi.fn(async (p: YoutubeProject) => {
      if (p.projectId === 'a') throw quotaError;
      return 'video-b';
    });
    const markExhausted = vi.fn(async (_project: YoutubeProject, _reason: string) => {});

    const result = await uploadWithProjectFailover({ availableProjects: projects, upload, markExhausted });

    expect(result).toEqual({ ok: true, videoId: 'video-b', project: projects[1] });
    expect(markExhausted).toHaveBeenCalledTimes(1);
    expect(markExhausted.mock.calls[0][0].projectId).toBe('a');
    expect(markExhausted.mock.calls[0][1]).toBe('quotaExceeded');
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('stops after the first success (never uploads twice for the same job)', async () => {
    const projects = [project('a'), project('b')];
    const upload = vi.fn(async () => 'video-a');
    const markExhausted = vi.fn(async (_project: YoutubeProject, _reason: string) => {});

    const result = await uploadWithProjectFailover({ availableProjects: projects, upload, markExhausted });

    expect(result).toMatchObject({ ok: true, videoId: 'video-a' });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(markExhausted).not.toHaveBeenCalled();
  });

  it('reports all-project exhaustion via videos.insert quota errors', async () => {
    const projects = [project('a'), project('b')];
    const upload = vi.fn(async (p: YoutubeProject) => {
      throw p.projectId === 'a' ? quotaError : uploadLimitError;
    });
    const markExhausted = vi.fn(async (_project: YoutubeProject, _reason: string) => {});

    const result = await uploadWithProjectFailover({ availableProjects: projects, upload, markExhausted });

    expect(result).toEqual({ ok: false, reason: 'uploadLimitExceeded' });
    expect(markExhausted).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('does not fail over on unrelated errors (bad credentials)', async () => {
    const projects = [project('a'), project('b')];
    const upload = vi.fn(async () => {
      throw authError;
    });
    const markExhausted = vi.fn(async (_project: YoutubeProject, _reason: string) => {});

    await expect(
      uploadWithProjectFailover({ availableProjects: projects, upload, markExhausted }),
    ).rejects.toBe(authError);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(markExhausted).not.toHaveBeenCalled();
  });

  it('does not fail over on network errors', async () => {
    const projects = [project('a'), project('b')];
    const upload = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    const markExhausted = vi.fn(async (_project: YoutubeProject, _reason: string) => {});

    await expect(
      uploadWithProjectFailover({ availableProjects: projects, upload, markExhausted }),
    ).rejects.toThrow('ECONNRESET');
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('returns not-ok without uploading when no projects are available', async () => {
    const upload = vi.fn(async () => 'never');
    const markExhausted = vi.fn(async (_project: YoutubeProject, _reason: string) => {});

    const result = await uploadWithProjectFailover({ availableProjects: [], upload, markExhausted });

    expect(result).toEqual({ ok: false, reason: 'quotaExceeded' });
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('withSiteLock', () => {
  it('serializes concurrent work for the same website', async () => {
    const events: string[] = [];
    const makeTask = (label: string, delay: number) =>
      withSiteLock('site-1', async () => {
        events.push(`${label}:start`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        events.push(`${label}:end`);
        return label;
      });

    const first = makeTask('first', 20);
    const second = makeTask('second', 1);

    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('runs work for different websites concurrently', async () => {
    const events: string[] = [];
    const taskA = withSiteLock('site-a', async () => {
      events.push('a:start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      events.push('a:end');
    });
    const taskB = withSiteLock('site-b', async () => {
      events.push('b:start');
      await new Promise((resolve) => setTimeout(resolve, 1));
      events.push('b:end');
    });

    await Promise.all([taskA, taskB]);

    expect(events[0]).toBe('a:start');
    expect(events[1]).toBe('b:start');
  });

  it('keeps the queue alive after a rejected task', async () => {
    await expect(withSiteLock('site-err', async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(withSiteLock('site-err', async () => 'ok')).resolves.toBe('ok');
  });
});

describe('withChannelLock', () => {
  it('serializes concurrent channel-config writes for the same website', async () => {
    const events: string[] = [];
    const makeTask = (label: string, delay: number) =>
      withChannelLock('site-1', async () => {
        events.push(`${label}:start`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        events.push(`${label}:end`);
        return label;
      });

    const first = makeTask('first', 20);
    const second = makeTask('second', 1);

    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('does not block on the publish lock', async () => {
    const events: string[] = [];
    const publish = withSiteLock('site-locked', async () => {
      events.push('publish:start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      events.push('publish:end');
    });
    const config = withChannelLock('site-locked', async () => {
      events.push('config:start');
    });

    await Promise.all([publish, config]);

    expect(events.indexOf('config:start')).toBeLessThan(events.indexOf('publish:end'));
  });
});
