import { google, youtube_v3 } from 'googleapis';
import { createReadStream } from 'fs';
import {
  YOUTUBE_CHANNELS_COLLECTION,
  VIDEO_JOBS_COLLECTION,
  WEBSITES_COLLECTION,
  USERS_COLLECTION,
} from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { decrypt, encrypt } from '@/lib/encryption';
import { ObjectId } from 'mongodb';
import { YoutubeChannel, YoutubeProject, YouTubeChannelStatus } from '@/types/youtube';
import { VideoCompilationProduct } from '@/types/video';
import { sendTelegramMessage } from '@/services/telegram/sendTelegramMessage';
import { resolveYoutubePublishAt } from './resolveYoutubePublishAt';
import {
  blockWebsiteQuota,
  getAvailableProjects,
  getProjectQuotaStates,
  getWebsiteQuotaBlock,
  isWebsiteYoutubeBlocked,
  markProjectQuotaExhausted,
  removeProjectQuotaState,
  withChannelLock,
  withSiteLock,
} from './projectQuota';
import {
  isQuotaExceededError,
  normalizeProjects,
  quotaReasonFromError,
  uploadWithProjectFailover,
} from './quotaRules';
import { applyProjectConnection, applyProjectCredentials } from './projectCredentials';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const MAX_YOUTUBE_RETRIES = 3;

const MAX_YOUTUBE_COMMENT_ATTEMPTS = 3;
const YOUTUBE_COMMENT_RETRY_DELAY_MS = 3_000;

const QUOTA_EXCEEDED_MESSAGE =
  'YouTube API quota exceeded for every configured project. Publishing will resume after the quota resets.';

// In-process guard so concurrent callers (retry cron + button) never publish
// the same job twice. Single-process deployment, matching AGENTS.md.
const inFlightPublishes = new Set<string>();

function generateProjectId(): string {
  return new ObjectId().toString();
}

  if (!channel) {
    throw new Error(
      'No YouTube OAuth config found for this site. Please save OAuth credentials first.',
    );
  }

  const clientSecret = decrypt(project.clientSecretEncrypted);

  return new google.auth.OAuth2(
    project.clientId,
    clientSecret,
    process.env.YOUTUBE_REDIRECT_URI,
  );
}

export async function saveOauthConfig(
  siteId: string,
  clientId: string,
  clientSecret: string,
  email: string,
) {
  const { db } = await connectToDatabase();
  const mirror = projects[0];

  const doc = {
    siteId,
    clientId: mirror?.clientId ?? '',
    clientSecretEncrypted: mirror?.clientSecretEncrypted ?? '',
    refreshTokenEncrypted: mirror?.refreshTokenEncrypted ?? '',
    channelId: mirror?.channelId ?? '',
    channelTitle: mirror?.channelTitle ?? '',
    connectedByEmail: mirror?.connectedByEmail ?? '',
    projects,
    updatedAt: now,
  };

  if (existing) {
    await db.collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION).updateOne(
      { siteId },
      {
        $set: {
          clientId,
          clientSecretEncrypted,
          updatedAt: now,
        },
      },
    );
  } else {
    await db.collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION).insertOne({
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

export async function getOauthConfig(
  siteId: string,
): Promise<{ configured: boolean; clientId?: string }> {
  const { db } = await connectToDatabase();
  const channel = await db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId });

    await writeProjects(siteId, result.projects, existing, now);
    return { projectId: result.project.projectId };
  });
}

export async function getOauthConfig(siteId: string): Promise<{
  configured: boolean;
  clientId?: string;
  projects: Array<{
    projectId: string;
    label?: string;
    clientId?: string;
    configured: boolean;
    connected: boolean;
    channelTitle?: string;
    channelId?: string;
    connectedByEmail?: string;
  }>;
}> {
  const channel = await getChannelBySiteId(siteId);
  const projects = normalizeProjects(channel);
  const configured = projects.filter((project) => project.clientId && project.clientSecretEncrypted);

  return {
    configured: configured.length > 0,
    clientId: configured[0]?.clientId,
    projects: projects.map((project) => ({
      projectId: project.projectId,
      label: project.label,
      clientId: project.clientId || undefined,
      configured: Boolean(project.clientId && project.clientSecretEncrypted),
      connected: Boolean(project.refreshTokenEncrypted),
      channelTitle: project.channelTitle || undefined,
      channelId: project.channelId || undefined,
      connectedByEmail: project.connectedByEmail || undefined,
    })),
  };
}

export function getAuthUrl(state: string, clientId: string): string {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    'dummy',
    process.env.YOUTUBE_REDIRECT_URI,
  );
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    state,
  });
}

export async function exchangeCode(code: string, siteId: string, projectId?: string) {
  const oauth2Client = await getOAuth2ClientForSite(siteId, projectId);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getChannelInfo(
  accessToken: string,
  refreshToken: string,
  siteId: string,
) {
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
  projectId?: string;
}) {
  return withChannelLock(channelData.siteId, async () => {
    const existing = await getChannelBySiteId(channelData.siteId);
    const projects = normalizeProjects(existing);
    const now = new Date();

    const result = applyProjectConnection({
      projects,
      projectId: channelData.projectId,
      generateProjectId,
      channelId: channelData.channelId,
      channelTitle: channelData.channelTitle,
      refreshTokenEncrypted: channelData.refreshTokenEncrypted,
      connectedByEmail: channelData.connectedByEmail,
      now,
    });

  if (existing) {
    await db.collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION).updateOne(
      { siteId: channelData.siteId },
      {
        $set: {
          channelId: channelData.channelId,
          channelTitle: channelData.channelTitle,
          refreshTokenEncrypted: channelData.refreshTokenEncrypted,
          connectedByEmail: channelData.connectedByEmail,
          updatedAt: now,
        },
      },
    );
  } else {
    await db.collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION).insertOne({
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

export async function getChannelBySiteId(
  siteId: string,
): Promise<YoutubeChannel | null> {
  const { db } = await connectToDatabase();
  return db
    .collection<YoutubeChannel>(YOUTUBE_CHANNELS_COLLECTION)
    .findOne({ siteId });
}

/**
 * Removes one project (when `projectId` is given) or the whole YouTube config
 * for the site. Quota state for removed projects is cleared so a later project
 * with the same id is not falsely considered exhausted.
 */
export async function removeChannel(siteId: string, projectId?: string): Promise<boolean> {
  return withChannelLock(siteId, async () => {
    const { db } = await connectToDatabase();
    const existing = await getChannelBySiteId(siteId);
    if (!existing) return false;

    if (!projectId) {
      await db.collection(YOUTUBE_CHANNELS_COLLECTION).deleteOne({ siteId });
      await removeProjectQuotaState(siteId);
      return true;
    }

    const projects = normalizeProjects(existing).filter((project) => project.projectId !== projectId);
    await removeProjectQuotaState(siteId, projectId);

    if (projects.length === 0) {
      await db.collection(YOUTUBE_CHANNELS_COLLECTION).deleteOne({ siteId });
    } else {
      await writeProjects(siteId, projects, existing, new Date());
    }
    return true;
  });
}

type YoutubeClient = ReturnType<typeof google.youtube>;

async function createYoutubeClient(
  siteId: string,
  refreshToken: string,
): Promise<YoutubeClient> {
  const oauth2Client = await getOAuth2ClientForSite(siteId);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

export async function getYoutubeStatus(siteId: string): Promise<YouTubeChannelStatus> {
  const channel = await getChannelBySiteId(siteId);
  const projects = normalizeProjects(channel);
  const now = new Date();
  const [states, block] = await Promise.all([
    getProjectQuotaStates(siteId),
    getWebsiteQuotaBlock(siteId, now),
  ]);

  const connectedProjects = projects.filter((project) => project.refreshTokenEncrypted);
  const primary = connectedProjects[0];

  return {
    connected: connectedProjects.length > 0,
    channelTitle: primary?.channelTitle,
    channelId: primary?.channelId,
    connectedByEmail: primary?.connectedByEmail,
    updatedAt: primary?.updatedAt as unknown as string,
    hasOauthConfig: projects.some((project) => project.clientId && project.clientSecretEncrypted),
    projects: projects.map((project) => {
      const state = states.find(
        (item) =>
          item.projectId === project.projectId &&
          new Date(item.exhaustedUntil).getTime() > now.getTime(),
      );
      return {
        projectId: project.projectId,
        label: project.label,
        clientId: project.clientId || undefined,
        configured: Boolean(project.clientId && project.clientSecretEncrypted),
        connected: Boolean(project.refreshTokenEncrypted),
        channelId: project.channelId || undefined,
        channelTitle: project.channelTitle || undefined,
        connectedByEmail: project.connectedByEmail || undefined,
        updatedAt: project.updatedAt as unknown as string,
        quotaBlocked: Boolean(state),
        quotaResetAt: state?.exhaustedUntil,
      };
    }),
    blocked: Boolean(block),
    blockedUntil: block?.blockedUntil,
  };
}

function resolvePublishAt(value: unknown, now: Date = new Date()): Date | null {
  if (!value) return null;
  const date =
    value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() > now.getTime() ? date : null;
}

function isInvalidPublishAt(error: any): boolean {
  return Boolean(
    error?.errors?.some((item: any) => item?.reason === 'invalidPublishAt'),
  );
}

const YOUTUBE_COMMENT_SCOPE_ERROR =
  'The YouTube channel is not authorized to post comments. Reauthorize it in website settings (YouTube Channel > Reauthorize) to grant the youtube.force-ssl permission.';

const YOUTUBE_COMMENT_ERROR_MESSAGES: Record<string, string> = {
  commentTextRequired: 'The comment text was empty or rejected by YouTube.',
  commentTextTooLong:
    'The comment text exceeds the YouTube comment length limit.',
  commentsDisabled: 'Comments are disabled on this video.',
  forbidden:
    'The authenticated account does not have permission to insert comments on this video.',
  insufficientAuthenticationScopes: YOUTUBE_COMMENT_SCOPE_ERROR,
  insufficientPermissions: YOUTUBE_COMMENT_SCOPE_ERROR,
  ineligibleAccount:
    'The YouTube account used to authorize the request must be linked to a Google account.',
  quotaExceeded: 'YouTube API quota exceeded.',
  videoNotFound:
    'YouTube could not find the uploaded video, so the comment was not added.',
  channelNotFound: 'YouTube could not resolve the channel for the comment.',
  processingFailure: 'YouTube failed to process the comment request.',
};

function describeYoutubeCommentError(error: any): string {
  const reason = error?.errors?.[0]?.reason as string | undefined;
  const code = error?.code as number | undefined;
  const base = reason ? YOUTUBE_COMMENT_ERROR_MESSAGES[reason] : undefined;

  if (base) {
    return code ? `${base} (${code}/${reason})` : `${base} (${reason})`;
  }

  if (code === 401 || String(error?.message || '').includes('invalid_grant')) {
    return 'YouTube authentication expired. Reconnect the channel in website settings. (authError)';
  }

  if (
    String(error?.message || '').includes('insufficient authentication scopes')
  ) {
    return code
      ? `${YOUTUBE_COMMENT_SCOPE_ERROR} (${code})`
      : YOUTUBE_COMMENT_SCOPE_ERROR;
  }

  const message =
    error?.message || 'Unknown error while adding the YouTube comment';
  return code ? `${message} (${code}${reason ? `/${reason}` : ''})` : message;
}

function buildVideoStatus(
  publishAt: Date | null,
): youtube_v3.Schema$VideoStatus {
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

type PublishResult =
  | { videoId: string }
  | { skipped: true }
  | { error: string; retryable: boolean };

async function markJobFailedWithoutRetry(jobId: string, message: string): Promise<void> {
  const { db } = await connectToDatabase();
  await db
    .collection(VIDEO_JOBS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { youtubeStatus: 'failed', youtubeError: message } },
    );
}

async function blockAndFail(
  siteId: string,
  jobId: string,
  siteId: string,
): Promise<
  | { videoId: string }
  | { skipped: true }
  | { error: string; retryable: boolean }
> {
  const { db } = await connectToDatabase();

  const channel = await getChannelBySiteId(siteId);
  const projects = normalizeProjects(channel);
  const connectedProjects = projects.filter((project) => project.refreshTokenEncrypted);
  if (connectedProjects.length === 0) {
    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { youtubeStatus: 'not_published', youtubeError: undefined } },
      );
    return { skipped: true };
  }

  const job = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .findOne({ _id: new ObjectId(jobId) });

  if (!job) return { error: 'Job not found', retryable: false };
  if (job.status !== 'completed')
    return { error: 'Video is not completed yet', retryable: false };
  if (!job.outputPath)
    return { error: 'No video output path found', retryable: false };
  if (job.youtubeVideoId && job.youtubeStatus === 'published') {
    return { skipped: true };
  }

  const now = new Date();

  // Website-level pause: fail fast without burning retries or re-uploading.
  if (await isWebsiteYoutubeBlocked(siteId, now)) {
    if (!job.youtubeVideoId) {
      await markJobFailedWithoutRetry(jobId, QUOTA_EXCEEDED_MESSAGE);
    }
    return { error: QUOTA_EXCEEDED_MESSAGE, retryable: true };
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

  const title = buildTitle(productName);
  const description = buildDescription(
    productName,
    siteDisplayName,
    siteHomepageUrl,
    productUrl,
    productTags,
    productShortDescription,
    youtubeDescriptionTemplate,
  );
  const tags = buildTags(productName, siteDisplayName, productTags);
  const commentText = buildComment(
    productName,
    siteDisplayName,
    siteHomepageUrl,
    productUrl,
    productTags,
    productShortDescription,
    youtubeCommentTemplate,
  );

  const existingVideoId: string = job.youtubeVideoId || '';
  let publishAt = resolvePublishAt(job.youtubePublishAt);

  // Auto-assign a stable publish slot for fresh uploads that have no explicit
  // future schedule (unscheduled products, legacy/in-flight jobs). Jobs that
  // were already uploaded (scheduled releases, retries) keep their stored
  // schedule so releaseScheduledPublishes and retries behave as before.
  // Persisting before upload makes the slot stable across cron runs/retries.
  if (!publishAt && !existingVideoId) {
    const assigned = await resolveYoutubePublishAt(siteId, null);
    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { youtubePublishAt: assigned } }
      );
    job.youtubePublishAt = assigned;
    publishAt = assigned;
  }

  if (!existingVideoId) {
    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { youtubeStatus: 'publishing' } },
      );
  }

  try {
    let videoId = existingVideoId;
    let isNewUpload = false;
    let activeProject: YoutubeProject | null = existingVideoId
      ? connectedProjects.find((project) => project.projectId === job.youtubeProjectId) ?? connectedProjects[0]
      : null;
    let activeClient: YoutubeClient | null = null;

    if (videoId) {
      activeClient = await createYoutubeClientForProject(activeProject!);
      try {
        await applyScheduleToVideo(activeClient, videoId, publishAt);
      } catch (error) {
        if (isQuotaExceededError(error) && activeProject) {
          await markProjectQuotaExhausted(
            siteId,
            activeProject.projectId,
            'videos.update',
            quotaReasonFromError(error) || 'quotaExceeded',
            new Date(),
          );
        }
        throw error;
      }
    } else {
      const available = await getAvailableProjects(siteId, 'videos.insert', now);
      if (available.length === 0) {
        return await blockAndFail(
          siteId,
          jobId,
          connectedProjects.map((project) => project.projectId),
          'quotaExceeded',
        );
      }

      const attempt = await uploadWithProjectFailover({
        availableProjects: available,
        upload: async (project) => {
          const client = await createYoutubeClientForProject(project);
          return insertYoutubeVideo(client, job.outputPath, { title, description, tags }, publishAt);
        },
        markExhausted: async (project, reason) => {
          await markProjectQuotaExhausted(siteId, project.projectId, 'videos.insert', reason, new Date());
          console.log(
            `[YOUTUBE QUOTA] Project ${project.projectId} exhausted (${reason}); trying next project`
          );
        },
      });

      if (!attempt.ok) {
        return await blockAndFail(
          siteId,
          jobId,
          connectedProjects.map((project) => project.projectId),
          attempt.reason,
        );
      }

      videoId = attempt.videoId;
      activeProject = attempt.project;
      isNewUpload = true;

      // Persist the upload id + owning project immediately so a later
      // failure/retry can never re-upload or move the video to another channel.
      await db
        .collection(VIDEO_JOBS_COLLECTION)
        .updateOne(
          { _id: new ObjectId(jobId) },
          {
            $set: {
              youtubeVideoId: videoId,
              youtubeProjectId: activeProject.projectId,
              youtubeStatus: 'publishing',
              youtubeError: undefined,
            },
          },
        );
    }

    if (!activeClient && activeProject) {
      activeClient = await createYoutubeClientForProject(activeProject);
    }

    if (job.thumbnailPath && existsSync(job.thumbnailPath) && activeClient) {
      try {
        await activeClient.thumbnails.set({
          videoId,
          media: {
            mimeType: 'image/jpeg',
            body: createReadStream(job.thumbnailPath),
          },
        });
      } catch (thumbnailError: any) {
        if (isQuotaExceededError(thumbnailError) && activeProject) {
          await markProjectQuotaExhausted(
            siteId,
            activeProject.projectId,
            'thumbnails.set',
            quotaReasonFromError(thumbnailError) || 'quotaExceeded',
            new Date(),
          );
        }
        console.error(
          `[YOUTUBE THUMBNAIL] Job ${jobId} (video ${videoId}): ${thumbnailError?.message || 'Unknown error'}`
        );
      }
    }

    const fields: Record<string, any> = {
      youtubeStatus: publishAt ? 'scheduled' : 'published',
      youtubeVideoId: videoId,
      youtubeProjectId: activeProject?.projectId,
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
      .updateOne({ _id: new ObjectId(jobId) }, { $set: fields });

    // YouTube rejects commentThreads.insert (403 forbidden) while a video is still
    // private/scheduled, so a scheduled upload is commented once
    // releaseScheduledPublishes flips the existing video to public instead.
    const isScheduleRelease =
      !isNewUpload && job.youtubeStatus === 'scheduled' && !publishAt;

    const shouldAddComment =
      !publishAt &&
      !job.youtubeCommentedAt &&
      (isNewUpload || isScheduleRelease);

    const attempts = isScheduleRelease ? MAX_YOUTUBE_COMMENT_ATTEMPTS : 1;

    if (shouldAddComment) {
      await insertYoutubeCommentWithRetry(
        videoId,
        siteId,
        commentText,
        attempts,
      )
        .then(() =>
          db
            .collection(VIDEO_JOBS_COLLECTION)
            .updateOne(
              { _id: new ObjectId(jobId) },
              {
                $set: {
                  youtubeCommentedAt: new Date(),
                  youtubeCommentError: undefined,
                },
              },
            )
            .catch(() => {}),
        )
        .catch(async (err: any) => {
          const commentError = describeYoutubeCommentError(err);
          console.error(
            `[YOUTUBE COMMENT] Job ${jobId} (video ${videoId}): ${commentError}`,
          );
          await db
            .collection(VIDEO_JOBS_COLLECTION)
            .updateOne(
              { _id: new ObjectId(jobId) },
              { $set: { youtubeCommentError: commentError } },
            )
            .catch(() => {});
        });
    }

    if (publishAt) {
      console.log(
        `[YOUTUBE SCHEDULE] Job ${jobId} scheduled for ${publishAt.toISOString()} (product ${job.productId})`,
      );
    }

    return { videoId };
  } catch (error: any) {
    const quotaReason = quotaReasonFromError(error);
    const isRevokedToken =
      error?.code === 401 ||
      error?.message?.includes('invalid_grant') ||
      error?.message?.includes('Token has been expired or revoked');

    let errorMessage = error?.message || 'Unknown error during YouTube upload';

    if (quotaReason) {
      errorMessage = 'YouTube upload quota exceeded. Will retry automatically.';
    } else if (isRevokedToken) {
      errorMessage =
        'YouTube authentication expired. Reconnect the channel in website settings.';
    }

    console.error(`[YOUTUBE PUBLISH] Job ${jobId} failed: ${errorMessage}`);

    if (quotaReason) {
      // Quota failures must not consume the finite retry budget; the job stays
      // resumable until the quota resets.
      await markJobFailedWithoutRetry(jobId, errorMessage);
      return { error: errorMessage, retryable: true };
    }

    const retryCount = (job.youtubeRetryCount || 0) + 1;
    const retryable = !isRevokedToken && retryCount < MAX_YOUTUBE_RETRIES;

    await db.collection(VIDEO_JOBS_COLLECTION).updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          youtubeStatus: 'failed',
          youtubeError: errorMessage,
          youtubeRetryCount: retryCount,
        },
      },
    );

    const user = await db
      .collection(USERS_COLLECTION)
      .findOne({ email: website?.members?.[0] });
    if (user?.telegramId) {
      const time = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      await sendTelegramMessage({
        telegramId: user.telegramId,
        message: `<b>YouTube Upload Failed</b>\n\nProduct: ${job.productName || 'Unknown'}\nError: ${errorMessage}\nRetry: ${retryCount}/${MAX_YOUTUBE_RETRIES}\nTime: ${time}`,
      }).catch(() => {});
    }

    return { error: errorMessage, retryable };
  }
}

export async function addYoutubeComment(
  videoId: string,
  siteId: string,
  commentText: string,
): Promise<void> {
  if (!commentText) return;
  if (!project.refreshTokenEncrypted) return;

  const channel = await getChannelBySiteId(siteId);
  if (!channel?.refreshTokenEncrypted) return;

  const youtube = await createYoutubeClient(
    siteId,
    decrypt(channel.refreshTokenEncrypted),
  );

  await youtube.commentThreads.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textOriginal: commentText,
          },
        },
      },
    },
  });
}

async function insertYoutubeCommentWithRetry(
  videoId: string,
  project: YoutubeProject,
  commentText: string,
  attempts: number,
): Promise<void> {
  let lastError: any;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await addYoutubeComment(videoId, project, commentText);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, YOUTUBE_COMMENT_RETRY_DELAY_MS),
        );
      }
    }
  }

  throw lastError;
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
    console.log(
      `[YOUTUBE RETRY] Retrying job ${jobId} (attempt ${(job.youtubeRetryCount || 0) + 1}/${MAX_YOUTUBE_RETRIES})`,
    );

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

export async function releaseScheduledPublishes(
  now: Date = new Date(),
): Promise<number> {
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
    console.log(
      `[YOUTUBE SCHEDULE] Releasing job ${jobId} (was scheduled for ${job.youtubePublishAt})`,
    );

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
let retryCronRunning = false;

export function startYoutubeRetryCron(intervalMs = 5 * 60 * 1000) {
  if (retryInterval) return;
  console.log(
    `[YOUTUBE RETRY] Starting retry cron (every ${intervalMs / 1000}s)`,
  );
  retryInterval = setInterval(async () => {
    if (retryCronRunning) return;
    retryCronRunning = true;
    try {
      const count = await retryFailedPublishes();
      if (count > 0) {
        console.log(`[YOUTUBE RETRY] Retried ${count} failed publish(es)`);
      }
    } catch (err: any) {
      console.error(
        `[YOUTUBE RETRY] Cron error: ${err?.message || 'Unknown error'}`,
      );
    }

    try {
      const released = await releaseScheduledPublishes();
      if (released > 0) {
        console.log(
          `[YOUTUBE SCHEDULE] Released ${released} scheduled video(s)`,
        );
      }
    } catch (err: any) {
      console.error(
        `[YOUTUBE SCHEDULE] Release error: ${err?.message || 'Unknown error'}`,
      );
    }
  }, intervalMs);
}

function buildTitle(productName: string, siteDisplayName: string): string {
  const title = `${productName} | ${siteDisplayName}`;
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
  template: string,
): string {
  if (template) {
    const tagsAsHashtags = productTags
      .map((t) => `#${t.replace(/\s+/g, '')}`)
      .join(' ');
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
    parts.push(
      `Discover more products at ${siteDisplayName}: ${siteHomepageUrl}`,
    );
  }

  if (productTags.length > 0) {
    parts.push('');
    parts.push(productTags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '));
  } else {
    parts.push('');
    parts.push(`#${productName.replace(/\s+/g, '')} #shop #product`);
  }

  return parts.join('\n');
}

function buildTags(
  productName: string,
  siteDisplayName: string,
  productTags: string[] = [],
): string[] {
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
  template: string,
): string {
  if (template) {
    const tagsAsHashtags = productTags
      .map((t) => `#${t.replace(/\s+/g, '')}`)
      .join(' ');
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

function buildCompilationComment(
  products: VideoCompilationProduct[],
  siteDisplayName: string,
  siteHomepageUrl: string,
  tag: string,
  template: string
): string {
  const links = products
    .map((product, index) => `${index + 1}. ${product.name} - ${product.url}`)
    .join('\n');

  if (template) {
    return template
      .replace(/\{productName\}/g, tag)
      .replace(/\{shortDescription\}/g, `Featured ${tag} products:`)
      .replace(/\{productUrl\}/g, links)
      .replace(/\{shopName\}/g, siteDisplayName)
      .replace(/\{siteUrl\}/g, siteHomepageUrl)
      .replace(/\{tags\}/g, tag)
      .replace(/\{tagsHashtags\}/g, `#${tag.replace(/\s+/g, '')}`);
  }

  const parts = [`Featured ${tag} products:`];
  parts.push(links);
  if (siteHomepageUrl && siteDisplayName) {
    parts.push('');
    parts.push(`Shop all at ${siteDisplayName}: ${siteHomepageUrl}`);
  }
  return parts.join('\n');
}
