import { VIDEO_JOBS_COLLECTION, AUDIO_FILES_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { VideoJob, VideoJobConfig } from '@/types/video';
import { WooWebsitePayload } from '@/types/woo';
import { VIDEO_CONFIG } from './config';
import { enqueueJob } from './jobManager';
import axios from 'axios';

interface CreateVideoJobsParams {
  websiteId: string;
  productIds: number[];
  website: WooWebsitePayload;
}

export async function createVideoJobsFromPipeline({
  websiteId,
  productIds,
  website,
}: CreateVideoJobsParams): Promise<{ created: number; errors: number }> {
  const { db } = await connectToDatabase();

  const woo = axios.create({
    baseURL: `${website.url}/wp-json/wc/v3`,
    auth: {
      username: website.wpUsername,
      password: website.wpAppPassword,
    },
    timeout: 30_000,
  });

  const backgroundMusicPath = website.backgroundMusicUrl || null;

  const audioFiles = await db
    .collection(AUDIO_FILES_COLLECTION)
    .find({})
    .toArray();

  const jobConfig: VideoJobConfig = {
    displayDuration: VIDEO_CONFIG.DEFAULT_DISPLAY_DURATION,
    transitionDuration: VIDEO_CONFIG.DEFAULT_TRANSITION_DURATION,
    kenBurns: VIDEO_CONFIG.DEFAULT_KEN_BURNS,
    backgroundMusicPath,
    outputWidth: VIDEO_CONFIG.OUTPUT_WIDTH,
    outputHeight: VIDEO_CONFIG.OUTPUT_HEIGHT,
  };

  let created = 0;
  let errors = 0;

  for (const productId of productIds) {
    try {
      const { data: product } = await woo.get(`/products/${productId}`);

      let imageUrls = (product.images || [])
        .map((img: any) => img.src)
        .filter(Boolean);

      if (imageUrls.length > VIDEO_CONFIG.MAX_IMAGES) {
        imageUrls = imageUrls.slice(0, VIDEO_CONFIG.MAX_IMAGES);
      }

      if (imageUrls.length === 0) {
        console.warn(`[VIDEO PIPELINE] Product ${productId} has no images, skipping`);
        continue;
      }

      if (imageUrls.length === 1) {
        imageUrls = [imageUrls[0], imageUrls[0]];
      }

      const selectedMusic = audioFiles.length > 0
        ? audioFiles[Math.floor(Math.random() * audioFiles.length)].url
        : backgroundMusicPath;

      const productTags = (product.tags || [])
        .map((t: any) => t.name)
        .filter(Boolean);

      const productShortDescription = (product.short_description || '')
        .replace(/<[^>]*>/g, '')
        .trim();

      const job: VideoJob = {
        websiteId,
        productId: String(productId),
        productName: product.name,
        images: imageUrls,
        productTags,
        productShortDescription,
        status: 'pending',
        progress: 0,
        outputPath: null,
        error: null,
        productUrl: product.permalink || null,
        config: {
          ...jobConfig,
          backgroundMusicPath: selectedMusic,
        },
        createdAt: new Date(),
        completedAt: null,
      };

      const result = await db
        .collection(VIDEO_JOBS_COLLECTION)
        .insertOne(job as any);

      const insertedJob: VideoJob = {
        ...job,
        _id: result.insertedId.toString(),
      };

      await enqueueJob(insertedJob._id!);
      created++;
    } catch (error: any) {
      console.error(`[VIDEO PIPELINE] Failed for product ${productId}: ${error?.message || 'Unknown error'}`);
      errors++;
    }
  }

  console.log(`[VIDEO PIPELINE] Done: ${created} created, ${errors} errors`);
  return { created, errors };
}
