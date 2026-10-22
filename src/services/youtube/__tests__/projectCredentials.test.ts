import { describe, expect, it } from 'vitest';
import { applyProjectConnection, applyProjectCredentials } from '../projectCredentials';
import { YoutubeProject } from '@/types/youtube';

const NOW = new Date('2026-10-22T00:00:00.000Z');

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

const generateProjectId = () => 'generated-project';

describe('applyProjectCredentials', () => {
  it('creates a new project instead of overwriting the first one when no id is given', () => {
    const existing = project('p1');

    const result = applyProjectCredentials({
      projects: [existing],
      projectId: undefined,
      generateProjectId,
      clientId: 'new-client',
      clientSecretEncrypted: 'new-secret',
      connectedByEmail: 'owner@example.com',
      now: NOW,
    });

    expect(result.created).toBe(true);
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0]).toEqual(existing);
    expect(result.projects[0].clientId).toBe('client-p1');
    expect(result.projects[0].clientSecretEncrypted).toBe('secret-p1');
    expect(result.project.projectId).toBe('generated-project');
    expect(result.project.clientId).toBe('new-client');
    expect(result.project.clientSecretEncrypted).toBe('new-secret');
    expect(result.project.refreshTokenEncrypted).toBe('');
  });

  it('updates the matching project in place when its id is given', () => {
    const existing = project('p1');
    const other = project('p2');

    const result = applyProjectCredentials({
      projects: [existing, other],
      projectId: 'p2',
      generateProjectId,
      clientId: 'updated-client',
      clientSecretEncrypted: 'updated-secret',
      connectedByEmail: 'owner@example.com',
      now: NOW,
    });

    expect(result.created).toBe(false);
    expect(result.projects).toHaveLength(2);
    expect(result.project.projectId).toBe('p2');
    expect(result.project.clientId).toBe('updated-client');
    expect(result.project.clientSecretEncrypted).toBe('updated-secret');
    expect(result.project.refreshTokenEncrypted).toBe('refresh-p2');
    expect(result.projects[0]).toEqual(existing);
  });

  it('creates a project with the given id when that id is unknown', () => {
    const result = applyProjectCredentials({
      projects: [project('p1')],
      projectId: 'p9',
      generateProjectId,
      clientId: 'client-p9',
      clientSecretEncrypted: 'secret-p9',
      now: NOW,
    });

    expect(result.created).toBe(true);
    expect(result.projects).toHaveLength(2);
    expect(result.project.projectId).toBe('p9');
  });

  it('keeps the existing channel when the email is empty', () => {
    const result = applyProjectCredentials({
      projects: [project('p1')],
      projectId: 'p1',
      generateProjectId,
      clientId: 'client-p1',
      clientSecretEncrypted: 'secret-p1',
      connectedByEmail: '',
      now: NOW,
    });

    expect(result.project.connectedByEmail).toBe('owner@example.com');
  });

  it('does not mutate the given project list', () => {
    const projects = [project('p1')];
    const snapshot = JSON.stringify(projects);

    applyProjectCredentials({
      projects,
      projectId: 'p1',
      generateProjectId,
      clientId: 'changed-client',
      clientSecretEncrypted: 'changed-secret',
      now: NOW,
    });

    expect(JSON.stringify(projects)).toBe(snapshot);
  });
});

describe('applyProjectConnection', () => {
  it('creates a new project instead of overwriting the first one when no id is given', () => {
    const existing = project('p1');

    const result = applyProjectConnection({
      projects: [existing],
      projectId: undefined,
      generateProjectId,
      channelId: 'channel-new',
      channelTitle: 'New Channel',
      refreshTokenEncrypted: 'refresh-new',
      connectedByEmail: 'owner@example.com',
      now: NOW,
    });

    expect(result.created).toBe(true);
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0]).toEqual(existing);
    expect(result.projects[0].refreshTokenEncrypted).toBe('refresh-p1');
    expect(result.project.projectId).toBe('generated-project');
    expect(result.project.refreshTokenEncrypted).toBe('refresh-new');
  });

  it('attaches the channel to the matching project only', () => {
    const result = applyProjectConnection({
      projects: [project('p1'), project('p2')],
      projectId: 'p2',
      generateProjectId,
      channelId: 'channel-2',
      channelTitle: 'Channel 2',
      refreshTokenEncrypted: 'refresh-2',
      connectedByEmail: 'owner@example.com',
      now: NOW,
    });

    expect(result.created).toBe(false);
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0].refreshTokenEncrypted).toBe('refresh-p1');
    expect(result.projects[1].refreshTokenEncrypted).toBe('refresh-2');
    expect(result.projects[1].clientId).toBe('client-p2');
  });
});
