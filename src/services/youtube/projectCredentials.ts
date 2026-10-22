/**
 * Pure helpers for writing one project's credentials into the `projects[]`
 * array of a `youtubeChannels` document. No DB access here so this module
 * stays unit-testable.
 *
 * The single rule both helpers enforce: an existing project is only modified
 * when its id is given explicitly and matches a stored project. Every other
 * call creates a NEW project, so adding a project can never overwrite the
 * credentials of the project that is already configured.
 */

import { YoutubeProject } from '@/types/youtube';

export interface ProjectWriteResult {
  /** The updated project list, ready to be persisted. */
  projects: YoutubeProject[];
  /** The project that was written. */
  project: YoutubeProject;
  /** True when a new project was appended instead of updating an existing one. */
  created: boolean;
}

function replaceProject(
  projects: YoutubeProject[],
  index: number,
  project: YoutubeProject,
): YoutubeProject[] {
  const next = [...projects];
  next[index] = project;
  return next;
}

/**
 * Applies OAuth credentials to a project. When no project matches `projectId`
 * a new project is appended, using `projectId` when it is given and a freshly
 * generated id otherwise.
 */
export function applyProjectCredentials(params: {
  projects: YoutubeProject[];
  /** Id of the project to update. Unknown or missing id => create a project. */
  projectId?: string;
  /** Id factory used when a new project is created without an id. */
  generateProjectId: () => string;
  clientId: string;
  clientSecretEncrypted: string;
  connectedByEmail?: string;
  now: Date;
}): ProjectWriteResult {
  const {
    projects,
    projectId,
    generateProjectId,
    clientId,
    clientSecretEncrypted,
    connectedByEmail,
    now,
  } = params;

  const index = projectId
    ? projects.findIndex((project) => project.projectId === projectId)
    : -1;

  if (index >= 0) {
    const current = projects[index];
    const updated: YoutubeProject = {
      ...current,
      clientId,
      clientSecretEncrypted,
      connectedByEmail: connectedByEmail || current.connectedByEmail,
      updatedAt: now,
    };
    return {
      projects: replaceProject(projects, index, updated),
      project: updated,
      created: false,
    };
  }

  const created: YoutubeProject = {
    projectId: projectId || generateProjectId(),
    label: '',
    clientId,
    clientSecretEncrypted,
    refreshTokenEncrypted: '',
    channelId: '',
    channelTitle: '',
    connectedByEmail: connectedByEmail || '',
    createdAt: now,
    updatedAt: now,
  };

  return { projects: [...projects, created], project: created, created: true };
}

/**
 * Attaches an authorized channel (refresh token + channel info) to a project.
 * When no project matches `projectId` a new project is appended.
 */
export function applyProjectConnection(params: {
  projects: YoutubeProject[];
  /** Id of the project to update. Unknown or missing id => create a project. */
  projectId?: string;
  /** Id factory used when a new project is created without an id. */
  generateProjectId: () => string;
  channelId: string;
  channelTitle: string;
  refreshTokenEncrypted: string;
  connectedByEmail: string;
  now: Date;
}): ProjectWriteResult {
  const {
    projects,
    projectId,
    generateProjectId,
    channelId,
    channelTitle,
    refreshTokenEncrypted,
    connectedByEmail,
    now,
  } = params;

  const index = projectId
    ? projects.findIndex((project) => project.projectId === projectId)
    : -1;

  if (index >= 0) {
    const current = projects[index];
    const updated: YoutubeProject = {
      ...current,
      channelId,
      channelTitle,
      refreshTokenEncrypted,
      connectedByEmail: connectedByEmail || current.connectedByEmail,
      updatedAt: now,
    };
    return {
      projects: replaceProject(projects, index, updated),
      project: updated,
      created: false,
    };
  }

  const created: YoutubeProject = {
    projectId: projectId || generateProjectId(),
    label: '',
    clientId: '',
    clientSecretEncrypted: '',
    refreshTokenEncrypted,
    channelId,
    channelTitle,
    connectedByEmail: connectedByEmail || '',
    createdAt: now,
    updatedAt: now,
  };

  return { projects: [...projects, created], project: created, created: true };
}
