export interface YoutubeChannel {
  _id?: string;
  siteId: string;
  channelId: string;
  channelTitle: string;
  clientId: string;
  clientSecretEncrypted: string;
  refreshTokenEncrypted: string;
  connectedByEmail: string;
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
  youtubePublishAt?: Date | string | null;
  youtubeError?: string;
  youtubePublishedAt?: Date;
}

export interface YouTubeChannelStatus {
  connected: boolean;
  channelTitle?: string;
  channelId?: string;
  connectedByEmail?: string;
  updatedAt?: string;
  hasOauthConfig: boolean;
}
