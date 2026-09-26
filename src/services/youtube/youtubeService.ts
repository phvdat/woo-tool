import { google, youtube_v3 } from 'googleapis';
import { createReadStream } from 'fs';
import { YOUTUBE_CHANNELS_COLLECTION, VIDEO_JOBS_COLLECTION, WEBSITES_COLLECTION, USERS_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { decrypt, encrypt } from '@/lib/encryption';
import { ObjectId } from 'mongodb';
import { YoutubeChannel, YoutubePublishJobFields } from '@/types/youtube';
import { sendTelegramMessage } from '@/services/telegram/sendTelegramMessage';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const MAX_YOUTUBE_RETRIES = 3;

export async function getOAuth2ClientForSite(siteId: string) {
  const { db } = await connectToDatabase();
  const channel = await db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId });

  if (!channel) {
    throw new Error('No YouTube OAuth config found for this site. Please save OAuth credentials first.');
  }

  const clientSecret = decrypt(channel.clientSecretEncrypted);

  return new google.auth.OAuth2(
    channel.clientId,
    clientSecret,
    process.env.YOUTUBE_REDIRECT_URI
  );
}

export async function saveOauthConfig(siteId: string, clientId: string, clientSecret: string, email: string) {
  const { db } = await connectToDatabase();
  const now = new Date();
  const clientSecretEncrypted = encrypt(clientSecret);

  const existing = await db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId });

  if (existing) {
    await db
      .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
      .updateOne(
        { siteId },
        {
          $set: {
            clientId,
            clientSecretEncrypted,
            updatedAt: now,
          },
        }
      );
  } else {
    await db
      .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
      .insertOne({
        siteId,
        channelId: '',
        channelTitle: '',
        clientId,
        clientSecretEncrypted,
        refreshTokenEncrypted: '',
        connectedByEmail: email,
        createdAt: now,
        updatedAt: now,
      });
  }
}

export async function getOauthConfig(siteId: string): Promise<{ configured: boolean; clientId?: string }> {
  const { db } = await connectToDatabase();
  const channel = await db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId });

  if (!channel || !channel.clientId || !channel.clientSecretEncrypted) {
    return { configured: false };
  }

  return { configured: true, clientId: channel.clientId };
}

export function getAuthUrl(state: string, clientId: string): string {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    'dummy',
    process.env.YOUTUBE_REDIRECT_URI
  );
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    state,
  });
}

export async function exchangeCode(code: string, siteId: string) {
  const oauth2Client = await getOAuth2ClientForSite(siteId);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getChannelInfo(accessToken: string, refreshToken: string, siteId: string) {
  const oauth2Client = await getOAuth2ClientForSite(siteId);
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const response = await youtube.channels.list({
    part: ['snippet'],
    mine: true,
  });

  const channel = response.data.items?.[0];
  if (!channel) throw new Error('No YouTube channel found for this account');

  return {
    channelId: channel.id!,
    channelTitle: channel.snippet?.title || 'Unknown',
  };
}

export async function upsertChannel(channelData: {
  siteId: string;
  channelId: string;
  channelTitle: string;
  refreshTokenEncrypted: string;
  connectedByEmail: string;
}) {
  const { db } = await connectToDatabase();
  const now = new Date();

  const existing = await db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId: channelData.siteId });

  if (existing) {
    await db
      .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
      .updateOne(
        { siteId: channelData.siteId },
        {
          $set: {
            channelId: channelData.channelId,
            channelTitle: channelData.channelTitle,
            refreshTokenEncrypted: channelData.refreshTokenEncrypted,
            connectedByEmail: channelData.connectedByEmail,
            updatedAt: now,
          },
        }
      );
  } else {
    await db
      .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
      .insertOne({
        siteId: channelData.siteId,
        channelId: channelData.channelId,
        channelTitle: channelData.channelTitle,
        clientId: '',
        clientSecretEncrypted: '',
        refreshTokenEncrypted: channelData.refreshTokenEncrypted,
        connectedByEmail: channelData.connectedByEmail,
        createdAt: now,
        updatedAt: now,
      });
  }
}

export async function getChannelBySiteId(siteId: string): Promise<YoutubeChannel | null> {
  const { db } = await connectToDatabase();
  return db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId });
}

export async function removeChannel(siteId: string): Promise<boolean> {
  const { db } = await connectToDatabase();
  const result = await db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .deleteOne({ siteId });
  return result.deletedCount > 0;
}

type YoutubeClient = ReturnType<typeof google.youtube>;

async function createYoutubeClient(siteId: string, refreshToken: string): Promise<YoutubeClient> {
  const oauth2Client = await getOAuth2ClientForSite(siteId);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

function resolvePublishAt(value: unknown, now: Date = new Date()): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() > now.getTime() ? date : null;
}

function isInvalidPublishAt(error: any): boolean {
  return Boolean(error?.errors?.some((item: any) => item?.reason === 'invalidPublishAt'));
}

function buildVideoStatus(publishAt: Date | null): youtube_v3.Schema$VideoStatus {
  if (publishAt) {
    return {
      privacyStatus: 'private',
      publishAt: publishAt.toISOString(),
      selfDeclaredMadeForKids: false,
    };
  }
  return {
    privacyStatus: 'public',
    selfDeclaredMadeForKids: false,
  };
}

async function insertYoutubeVideo(
  youtube: YoutubeClient,
  outputPath: string,
  snippet: { title: string; description: string; tags: string[] },
  publishAt: Date | null,
): Promise<string> {
  const requestBody: youtube_v3.Schema$Video = {
    snippet: {
      title: snippet.title,
      description: snippet.description,
      tags: snippet.tags,
      categoryId: '22',
    },
    status: buildVideoStatus(publishAt),
  };

  const body = createReadStream(outputPath);

  let response;
  try {
    response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody,
      media: { body },
    });
  } catch (error) {
    body.destroy();
    if (!publishAt || !isInvalidPublishAt(error)) throw error;

    requestBody.status = buildVideoStatus(null);
    response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody,
      media: { body: createReadStream(outputPath) },
    });
  }

  const videoId = response.data.id;
  if (!videoId) throw new Error('No video ID returned from YouTube API');
  return videoId;
}

async function applyScheduleToVideo(
  youtube: YoutubeClient,
  videoId: string,
  publishAt: Date | null,
): Promise<void> {
  await youtube.videos.update({
    part: ['status'],
    requestBody: {
      id: videoId,
      status: buildVideoStatus(publishAt),
    },
  });
}

export async function publishToYoutube(
  jobId: string,
  siteId: string
): Promise<{ videoId: string } | { skipped: true } | { error: string; retryable: boolean }> {
  const { db } = await connectToDatabase();

  const channel = await getChannelBySiteId(siteId);
  if (!channel || !channel.refreshTokenEncrypted) {
    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { youtubeStatus: 'not_published', youtubeError: undefined } }
      );
    return { skipped: true };
  }

  const job = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .findOne({ _id: new ObjectId(jobId) });

  if (!job) return { error: 'Job not found', retryable: false };
  if (job.status !== 'completed') return { error: 'Video is not completed yet', retryable: false };
  if (!job.outputPath) return { error: 'No video output path found', retryable: false };
  if (job.youtubeVideoId && job.youtubeStatus === 'published') {
    return { skipped: true };
  }

  const website = await db
    .collection(WEBSITES_COLLECTION)
    .findOne({ _id: new ObjectId(siteId) });

  const siteDisplayName = website?.shopName || 'Our Shop';
  const siteHomepageUrl = website?.url || '';
  const youtubeDescriptionTemplate = website?.youtubeDescriptionTemplate || '';
  const youtubeCommentTemplate = website?.youtubeCommentTemplate || '';

  const productUrl = job.productUrl || '';
  const productName = job.productName || 'Product';
  const productTags = (job.productTags as string[]) || [];
  const productShortDescription = (job.productShortDescription as string) || '';

  const title = buildTitle(productName, siteDisplayName);
  const description = buildDescription(
    productName,
    siteDisplayName,
    siteHomepageUrl,
    productUrl,
    productTags,
    productShortDescription,
    youtubeDescriptionTemplate
  );
  const tags = buildTags(productName, siteDisplayName, productTags);
  const commentText = buildComment(
    productName,
    siteDisplayName,
    siteHomepageUrl,
    productUrl,
    productTags,
    productShortDescription,
    youtubeCommentTemplate
  );

  const existingVideoId: string = job.youtubeVideoId || '';
  const publishAt = resolvePublishAt(job.youtubePublishAt);

  if (!existingVideoId) {
    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { youtubeStatus: 'publishing' } }
      );
  }

  try {
    const youtube = await createYoutubeClient(
      siteId,
      decrypt(channel.refreshTokenEncrypted),
    );

    let videoId = existingVideoId;

    if (videoId) {
      await applyScheduleToVideo(youtube, videoId, publishAt);
    } else {
      videoId = await insertYoutubeVideo(
        youtube,
        job.outputPath,
        { title, description, tags },
        publishAt,
      );
      await addYoutubeComment(videoId, siteId, commentText).catch(() => { });
    }

    const fields: Record<string, any> = {
      youtubeStatus: publishAt ? 'scheduled' : 'published',
      youtubeVideoId: videoId,
      youtubePublishAt: job.youtubePublishAt || null,
      youtubeError: undefined,
      youtubeRetryCount: 0,
    };
    if (!publishAt) {
      fields.youtubePublishedAt =
        job.youtubePublishedAt || job.youtubePublishAt || new Date();
    }

    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: fields }
      );

    if (publishAt) {
      console.log(
        `[YOUTUBE SCHEDULE] Job ${jobId} scheduled for ${publishAt.toISOString()} (product ${job.productId})`
      );
    }

    return { videoId };
  } catch (error: any) {
    const isRevokedToken =
      error?.code === 401 ||
      error?.message?.includes('invalid_grant') ||
      error?.message?.includes('Token has been expired or revoked');

    let errorMessage = error?.message || 'Unknown error during YouTube upload';

    if (error?.code === 403 && error?.errors?.[0]?.reason === 'quotaExceeded') {
      errorMessage = 'YouTube upload quota exceeded. Will retry automatically.';
    } else if (isRevokedToken) {
      errorMessage = 'YouTube authentication expired. Reconnect the channel in website settings.';
    }

    console.error(`[YOUTUBE PUBLISH] Job ${jobId} failed: ${errorMessage}`);

    const retryCount = (job.youtubeRetryCount || 0) + 1;
    const retryable = !isRevokedToken && retryCount < MAX_YOUTUBE_RETRIES;

    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            youtubeStatus: 'failed',
            youtubeError: errorMessage,
            youtubeRetryCount: retryCount,
          },
        }
      );

    const user = await db
      .collection(USERS_COLLECTION)
      .findOne({ email: website?.members?.[0] });
    if (user?.telegramId) {
      const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      await sendTelegramMessage({
        telegramId: user.telegramId,
        message: `<b>YouTube Upload Failed</b>\n\nProduct: ${job.productName || 'Unknown'}\nError: ${errorMessage}\nRetry: ${retryCount}/${MAX_YOUTUBE_RETRIES}\nTime: ${time}`,
      }).catch(() => { });
    }

    return { error: errorMessage, retryable };
  }
}

export async function addYoutubeComment(
  videoId: string,
  siteId: string,
  commentText: string
): Promise<void> {
  if (!commentText) return;

  const channel = await getChannelBySiteId(siteId);
  if (!channel?.refreshTokenEncrypted) return;

  const youtube = await createYoutubeClient(siteId, decrypt(channel.refreshTokenEncrypted));

  await youtube.commentThreads.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textDisplay: commentText,
          },
        },
      },
    },
  });
}

export async function retryFailedPublishes(): Promise<number> {
  const { db } = await connectToDatabase();

  const failedJobs = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .find({
      status: 'completed',
      youtubeStatus: 'failed',
      youtubeRetryCount: { $lt: MAX_YOUTUBE_RETRIES },
    })
    .sort({ completedAt: 1 })
    .toArray();

  let retriedCount = 0;

  for (const job of failedJobs) {
    const jobId = String(job._id);
    console.log(`[YOUTUBE RETRY] Retrying job ${jobId} (attempt ${(job.youtubeRetryCount || 0) + 1}/${MAX_YOUTUBE_RETRIES})`);

    const result = await publishToYoutube(jobId, job.websiteId);
    if (!('skipped' in result) && !('error' in result)) {
      retriedCount++;
    }

    if (retriedCount > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return retriedCount;
}

export async function releaseScheduledPublishes(now: Date = new Date()): Promise<number> {
  const { db } = await connectToDatabase();

  const dueJobs = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .find({
      status: 'completed',
      youtubeStatus: 'scheduled',
      youtubeVideoId: { $exists: true, $ne: '' },
      youtubePublishAt: { $ne: null, $lte: now },
    })
    .sort({ youtubePublishAt: 1 })
    .toArray();

  let releasedCount = 0;

  for (const job of dueJobs) {
    const jobId = String(job._id);
    console.log(`[YOUTUBE SCHEDULE] Releasing job ${jobId} (was scheduled for ${job.youtubePublishAt})`);

    const result = await publishToYoutube(jobId, job.websiteId);
    if (!('skipped' in result) && !('error' in result)) {
      releasedCount++;
    }

    if (releasedCount > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return releasedCount;
}

let retryInterval: ReturnType<typeof setInterval> | null = null;

export function startYoutubeRetryCron(intervalMs = 5 * 60 * 1000) {
  if (retryInterval) return;
  console.log(`[YOUTUBE RETRY] Starting retry cron (every ${intervalMs / 1000}s)`);
  retryInterval = setInterval(async () => {
    try {
      const count = await retryFailedPublishes();
      if (count > 0) {
        console.log(`[YOUTUBE RETRY] Retried ${count} failed publish(es)`);
      }
    } catch (err: any) {
      console.error(`[YOUTUBE RETRY] Cron error: ${err?.message || 'Unknown error'}`);
    }

    try {
      const released = await releaseScheduledPublishes();
      if (released > 0) {
        console.log(`[YOUTUBE SCHEDULE] Released ${released} scheduled video(s)`);
      }
    } catch (err: any) {
      console.error(`[YOUTUBE SCHEDULE] Release error: ${err?.message || 'Unknown error'}`);
    }
  }, intervalMs);
}

function buildTitle(productName: string, siteDisplayName: string): string {
  const title = `${siteDisplayName} | ${productName}`;
  if (title.length <= 70) return title;
  return `${productName.substring(0, 65)} | ${siteDisplayName}`;
}

function buildDescription(
  productName: string,
  siteDisplayName: string,
  siteHomepageUrl: string,
  productUrl: string,
  productTags: string[],
  productShortDescription: string,
  template: string
): string {
  if (template) {
    const tagsAsHashtags = productTags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
    const tagsAsText = productTags.join(', ');

    return template
      .replace(/\{productName\}/g, productName)
      .replace(/\{shortDescription\}/g, productShortDescription)
      .replace(/\{productUrl\}/g, productUrl)
      .replace(/\{shopName\}/g, siteDisplayName)
      .replace(/\{siteUrl\}/g, siteHomepageUrl)
      .replace(/\{tags\}/g, tagsAsText)
      .replace(/\{tagsHashtags\}/g, tagsAsHashtags);
  }

  const parts: string[] = [];

  if (productUrl) {
    parts.push(`Shop now: ${productUrl}`);
  }

  parts.push('');
  parts.push(`${productName}`);
  parts.push('');

  if (productShortDescription) {
    parts.push(productShortDescription);
    parts.push('');
  }

  if (productUrl) {
    parts.push(`See details & order: ${productUrl}`);
  }

  if (siteHomepageUrl && siteDisplayName) {
    parts.push(`Discover more products at ${siteDisplayName}: ${siteHomepageUrl}`);
  }

  if (productTags.length > 0) {
    parts.push('');
    parts.push(productTags.map(t => `#${t.replace(/\s+/g, '')}`).join(' '));
  } else {
    parts.push('');
    parts.push(`#${productName.replace(/\s+/g, '')} #shop #product`);
  }

  return parts.join('\n');
}

function buildTags(productName: string, siteDisplayName: string, productTags: string[] = []): string[] {
  if (productTags.length > 0) {
    const tags = [...productTags, siteDisplayName];
    const totalLength = tags.join(',').length;
    if (totalLength > 490) {
      return tags.slice(0, 3);
    }
    return tags;
  }

  const tags: string[] = [productName, siteDisplayName];
  const categories = productName.split(/\s+/).filter((w) => w.length > 3);
  tags.push(...categories.slice(0, 5));
  const totalLength = tags.join(',').length;
  if (totalLength > 490) {
    return tags.slice(0, 3);
  }
  return tags;
}

function buildComment(
  productName: string,
  siteDisplayName: string,
  siteHomepageUrl: string,
  productUrl: string,
  productTags: string[],
  productShortDescription: string,
  template: string
): string {
  if (template) {
    const tagsAsHashtags = productTags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
    const tagsAsText = productTags.join(', ');

    return template
      .replace(/\{productName\}/g, productName)
      .replace(/\{shortDescription\}/g, productShortDescription)
      .replace(/\{productUrl\}/g, productUrl)
      .replace(/\{shopName\}/g, siteDisplayName)
      .replace(/\{siteUrl\}/g, siteHomepageUrl)
      .replace(/\{tags\}/g, tagsAsText)
      .replace(/\{tagsHashtags\}/g, tagsAsHashtags);
  }

  return productUrl;
}
