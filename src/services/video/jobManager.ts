import { VIDEO_JOBS_COLLECTION, WEBSITES_COLLECTION, USERS_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { VideoJob, VideoJobStatus } from '@/types/video';
import { ObjectId } from 'mongodb';
import { VIDEO_CONFIG } from './config';
import { prepImages, cleanupTempDir } from './imagePrep';
import { renderVideo } from './renderVideo';
import { publishToYoutube } from '@/services/youtube/youtubeService';
import { sendTelegramMessage } from '@/services/telegram/sendTelegramMessage';
import path from 'path';

let isProcessing = false;
let processingCount = 0;

function emitVideoProgress(jobId: string, percent: number) {
  try {
    const { getSocket } = require('@/config/socket');
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('video-progress', { jobId, progress: { percent } });
  } catch {}
}

function emitVideoCompleted(jobId: string) {
  try {
    const { getSocket } = require('@/config/socket');
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('video-completed', { jobId });
  } catch {}
}

function emitVideoError(jobId: string, error: string) {
  try {
    const { getSocket } = require('@/config/socket');
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('video-error', { jobId, message: error });
  } catch {}
}

async function updateJobStatus(
  jobId: string,
  status: VideoJobStatus,
  extra: Partial<VideoJob> = {}
) {
  const { db } = await connectToDatabase();
  await db
    .collection(VIDEO_JOBS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { status, ...extra } }
    );
}

async function getTelegramIdForJob(job: VideoJob): Promise<string | null> {
  try {
    const { db } = await connectToDatabase();
    const website = await db
      .collection(WEBSITES_COLLECTION)
      .findOne({ _id: new ObjectId(job.websiteId) });
    if (!website) return null;
    const user = await db
      .collection(USERS_COLLECTION)
      .findOne({ email: website.members?.[0] });
    return user?.telegramId || null;
  } catch {
    return null;
  }
}

async function processJob(job: VideoJob) {
  const jobId = String(job._id!);
  const frameDir = path.join('/tmp/video-gen', jobId);

  try {
    await updateJobStatus(jobId, 'preparing', { progress: 0 });
    emitVideoProgress(jobId, 0);

    const { frameDir: preparedDir, frameCount } = await prepImages(jobId, job.images);

    if (frameCount === 0) {
      throw new Error('No valid images found for this product');
    }

    await updateJobStatus(jobId, 'rendering', { progress: 5 });
    emitVideoProgress(jobId, 5);

    const { outputPath } = await renderVideo({
      jobId,
      productId: job.productId,
      frameDir: preparedDir,
      frameCount,
      displayDuration: job.config.displayDuration,
      transitionDuration: job.config.transitionDuration,
      kenBurns: job.config.kenBurns,
      backgroundMusicPath: job.config.backgroundMusicPath,
      onProgress: (percent) => {
        const adjusted = 5 + Math.round(percent * 0.95);
        updateJobStatus(jobId, 'rendering', { progress: adjusted });
        emitVideoProgress(jobId, adjusted);
      },
    });

    await updateJobStatus(jobId, 'completed', {
      progress: 100,
      outputPath,
      completedAt: new Date(),
    });
    emitVideoCompleted(jobId);

    publishToYoutube(jobId, job.websiteId).catch((err) => {
      console.error(`[YOUTUBE AUTO-PUBLISH] Job ${jobId} failed: ${err?.message || 'Unknown error'}`);
    });
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    console.error(`[VIDEO JOB] Job ${jobId} failed: ${message}`);
    await updateJobStatus(jobId, 'failed', { error: message });
    emitVideoError(jobId, message);

    const telegramId = await getTelegramIdForJob(job);
    if (telegramId) {
      const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      await sendTelegramMessage({
        telegramId,
        message: `<b>Video Generation Failed</b>\n\nProduct: ${job.productName}\nError: ${message}\nTime: ${time}`,
      }).catch(() => {});
    }
  } finally {
    cleanupTempDir(frameDir);
    processingCount--;
    tryProcessNext();
  }
}

async function tryProcessNext() {
  if (processingCount >= VIDEO_CONFIG.MAX_CONCURRENT_JOBS) return;
  if (isProcessing) return;

  isProcessing = true;
  try {
    const { db } = await connectToDatabase();
    const nextJob = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .findOneAndUpdate(
        { status: 'pending' },
        { $set: { status: 'pending' } },
        { sort: { createdAt: 1 } }
      );

    if (nextJob) {
      processingCount++;
      processJob(nextJob as unknown as VideoJob);
    }
  } finally {
    isProcessing = false;
  }
}

export async function enqueueJob(jobId: string) {
  const { db } = await connectToDatabase();
  const job = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .findOne({ _id: new ObjectId(jobId) });

  if (!job) throw new Error('Job not found');

  processingCount++;
  processJob(job as unknown as VideoJob);
}

export async function recoverPendingJobs() {
  const { db } = await connectToDatabase();

  await db
    .collection(VIDEO_JOBS_COLLECTION)
    .updateMany(
      { status: { $in: ['preparing', 'rendering'] } },
      { $set: { status: 'pending', progress: 0 } }
    );

  const pendingJobs = await db
    .collection(VIDEO_JOBS_COLLECTION)
    .find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .toArray();

  for (const job of pendingJobs) {
    if (processingCount >= VIDEO_CONFIG.MAX_CONCURRENT_JOBS) break;
    processingCount++;
    processJob(job as unknown as VideoJob);
  }
}
