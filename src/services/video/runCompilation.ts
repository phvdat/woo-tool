import axios from 'axios';
import { AUDIO_FILES_COLLECTION, VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { getErrorMessage } from '@/lib/error-utils';
import { VideoJob, VideoJobConfig } from '@/types/video';
import { WooWebsitePayload } from '@/types/woo';
import { VIDEO_CONFIG } from './config';
import { enqueueJob } from './jobManager';
import {
  COMPILATION_SIZE,
  CompilationProductInput,
  buildCompilationBatchKey,
  selectCompilationProducts,
} from './compilation';

export const DEFAULT_COMPILATION_INTERVAL_MINUTES = 30;

const ACTIVE_STATUSES = ['pending', 'preparing', 'rendering'];

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Builds one themed compilation video for a website by picking a random product
 * tag, taking its 5 newest products, and queueing a single multi-image render
 * job. No-ops when a compilation for this website is already in flight, when
 * the configured interval has not elapsed, or when the newest batch for every
 * candidate tag was already rendered.
 */
export async function runCompilationForWebsite(
  website: WooWebsitePayload
): Promise<boolean> {
  const websiteId = String(website._id);
  if (!websiteId) return false;

  const intervalMinutes =
    website.autoCompilation?.intervalMinutes &&
    website.autoCompilation.intervalMinutes > 0
      ? website.autoCompilation.intervalMinutes
      : DEFAULT_COMPILATION_INTERVAL_MINUTES;

  const { db } = await connectToDatabase();
  const jobs = db.collection(VIDEO_JOBS_COLLECTION);

  const active = await jobs.findOne({
    websiteId,
    kind: 'compilation',
    status: { $in: ACTIVE_STATUSES },
  });
  if (active) return false;

  const last = await jobs
    .find({ websiteId, kind: 'compilation' })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  if (last?.createdAt) {
    const elapsedMs = Date.now() - new Date(last.createdAt).getTime();
    if (elapsedMs < intervalMinutes * 60_000) return false;
  }

  const woo = axios.create({
    baseURL: `${website.url}/wp-json/wc/v3`,
    auth: {
      username: website.wpUsername,
      password: website.wpAppPassword,
    },
    timeout: 30_000,
  });

  let tags: any[] = [];
  try {
    const { data } = await woo.get('/products/tags', {
      params: { per_page: 100, orderby: 'count', order: 'desc', hide_empty: true },
    });
    tags = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(
      `[COMPILATION] ${website.shopName}: failed to load tags: ${getErrorMessage(error)}`
    );
    return false;
  }

  const candidates = shuffle(
    tags.filter((tag) => Number(tag.count || 0) >= COMPILATION_SIZE)
  );
  if (candidates.length === 0) return false;

  const audioFiles = await db.collection(AUDIO_FILES_COLLECTION).find({}).toArray();
  const backgroundMusicPath = website.backgroundMusicUrl || null;

  for (const tag of candidates) {
    let products: CompilationProductInput[] = [];
    try {
      const { data } = await woo.get('/products', {
        params: {
          tag: tag.id,
          per_page: COMPILATION_SIZE,
          orderby: 'date',
          order: 'desc',
          status: 'publish',
        },
      });
      products = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(
        `[COMPILATION] ${website.shopName}: tag "${tag.name}" fetch failed: ${getErrorMessage(error)}`
      );
      continue;
    }

    const selected = selectCompilationProducts(products, COMPILATION_SIZE);
    if (selected.length < COMPILATION_SIZE) continue;

    const batchKey = buildCompilationBatchKey(selected.map((p) => p.id));

    const alreadyCompleted = await jobs.findOne({
      websiteId,
      kind: 'compilation',
      status: 'completed',
      compilationBatchKey: batchKey,
    });
    if (alreadyCompleted) continue;

    const alreadyQueued = await jobs.findOne({
      websiteId,
      kind: 'compilation',
      status: { $in: ACTIVE_STATUSES },
      compilationBatchKey: batchKey,
    });
    if (alreadyQueued) continue;

    const selectedMusic =
      audioFiles.length > 0
        ? audioFiles[Math.floor(Math.random() * audioFiles.length)].url
        : backgroundMusicPath;

    const jobConfig: VideoJobConfig = {
      displayDuration: VIDEO_CONFIG.DEFAULT_DISPLAY_DURATION,
      transitionDuration: VIDEO_CONFIG.DEFAULT_TRANSITION_DURATION,
      kenBurns: VIDEO_CONFIG.DEFAULT_KEN_BURNS,
      backgroundMusicPath: selectedMusic,
      outputWidth: VIDEO_CONFIG.OUTPUT_WIDTH,
      outputHeight: VIDEO_CONFIG.OUTPUT_HEIGHT,
    };

    const job: VideoJob = {
      websiteId,
      productId: `compilation-${batchKey}`,
      productName: `${tag.name} Collection`,
      images: selected.map((p) => p.images![0].src as string),
      productTags: [tag.name],
      productShortDescription: '',
      status: 'pending',
      progress: 0,
      outputPath: null,
      error: null,
      productUrl: null,
      config: jobConfig,
      createdAt: new Date(),
      completedAt: null,
      kind: 'compilation',
      compilationTag: tag.name,
      compilationBatchKey: batchKey,
      compilationProductIds: selected.map((p) => String(p.id)),
      compilationProducts: selected.map((p) => ({
        name: p.name,
        url: p.permalink || '',
      })),
      youtubePublishAt: null,
    };

    const result = await db.collection(VIDEO_JOBS_COLLECTION).insertOne(job as any);
    await enqueueJob(String(result.insertedId));
    console.log(
      `[COMPILATION] ${website.shopName}: queued "${tag.name}" batch ${batchKey}`
    );
    return true;
  }

  return false;
}
