export interface YoutubeProject {
  projectId: string;
  label?: string;
  clientId: string;
  clientSecretEncrypted: string;
  refreshTokenEncrypted: string;
  channelId: string;
  channelTitle: string;
  connectedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface YoutubeChannel {
  _id?: string;
  siteId: string;
  // Legacy single-project fields. Mirrors projects[0] for backward
  // compatibility with documents written before multi-project support.
  channelId: string;
  channelTitle: string;
  clientId: string;
  clientSecretEncrypted: string;
  refreshTokenEncrypted: string;
  connectedByEmail: string;
  // Multiple API projects. Absent on legacy single-project documents; use
  // normalizeProjects() to read either shape.
  projects?: YoutubeProject[];
  createdAt: Date;
  updatedAt: Date;
}

export type YoutubePublishStatus =
  | 'not_published'
  | 'publishing'
  | 'scheduled'
  | 'published'
  | 'failed';

export interface YoutubePublishJobFields {
  youtubeStatus?: YoutubePublishStatus;
  youtubeVideoId?: string;
  youtubeProjectId?: string;
  youtubePublishAt?: Date | string | null;
  youtubeError?: string;
  youtubeCommentError?: string;
  youtubePublishedAt?: Date;
  youtubeRetryCount?: number;
}

/** YouTube Data API operation a quota limit applies to. */
export type YoutubeQuotaOperation =
  | 'videos.insert'
  | 'videos.update'
  | 'thumbnails.set'
  | 'commentThreads.insert';

/** Persistent per-project quota exhaustion, scoped to one operation. */
export interface YoutubeProjectQuotaState {
  _id?: string;
  siteId: string;
  projectId: string;
  operation: YoutubeQuotaOperation;
  reason: string;
  exhaustedAt: Date;
  exhaustedUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Persistent website-level pause while every project is out of quota. */
export interface YoutubeWebsiteQuotaBlock {
  _id?: string;
  siteId: string;
  blockedAt: Date;
  blockedUntil: Date;
  projects: string[];
  reason: string;
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface YouTubeProjectStatus {
  projectId: string;
  label?: string;
  clientId?: string;
  configured: boolean;
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  connectedByEmail?: string;
  updatedAt?: Date | string;
  quotaBlocked?: boolean;
  quotaResetAt?: Date | string;
}

export interface YouTubeChannelStatus {
  connected: boolean;
  channelTitle?: string;
  channelId?: string;
  connectedByEmail?: string;
  updatedAt?: string;
  hasOauthConfig: boolean;
  projects?: YouTubeProjectStatus[];
  blocked?: boolean;
  blockedUntil?: Date | string;
}
