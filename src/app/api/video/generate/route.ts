import { VIDEO_JOBS_COLLECTION, WEBSITES_COLLECTION, AUDIO_FILES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { VideoJob, VideoJobConfig } from '@/types/video';
import { VIDEO_CONFIG } from '@/services/video/config';
import { enqueueJob } from '@/services/video/jobManager';
import axios from 'axios';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import path from 'path';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { websiteId, productIds, config: userConfig } = body;

    if (!websiteId || !productIds?.length) {
      return Response.json(
        { error: 'websiteId and productIds are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const website = await db
      .collection(WEBSITES_COLLECTION)
      .findOne({ _id: new ObjectId(websiteId) });

    if (!website) {
      return Response.json({ error: 'Website not found' }, { status: 404 });
    }

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
      displayDuration: userConfig?.displayDuration || VIDEO_CONFIG.DEFAULT_DISPLAY_DURATION,
      transitionDuration: userConfig?.transitionDuration || VIDEO_CONFIG.DEFAULT_TRANSITION_DURATION,
      kenBurns: userConfig?.kenBurns ?? VIDEO_CONFIG.DEFAULT_KEN_BURNS,
      backgroundMusicPath,
      outputWidth: VIDEO_CONFIG.OUTPUT_WIDTH,
      outputHeight: VIDEO_CONFIG.OUTPUT_HEIGHT,
    };

    const createdJobs: VideoJob[] = [];

    for (const productId of productIds) {
      try {
        const { data: product } = await woo.get(`/products/${productId}`);

        let imageUrls = (product.images || [])
          .map((img: any) => img.src)
          .filter(Boolean);

        if (imageUrls.length === 0) {
          console.warn(`[VIDEO GENERATE] Product ${productId} has no images, skipping`);
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
          .insertOne(job);

        const insertedJob: VideoJob = {
          ...job,
          _id: result.insertedId.toString(),
        };

        createdJobs.push(insertedJob);
      } catch (error: any) {
        console.error(`[VIDEO GENERATE] Failed to fetch product ${productId}:`, error?.message);
      }
    }

    for (const job of createdJobs) {
      try {
        await enqueueJob(job._id!);
      } catch (error: any) {
        console.error(`[VIDEO GENERATE] Failed to enqueue job ${job._id}:`, error?.message);
      }
    }

    return Response.json({ jobs: createdJobs });
  } catch (error: any) {
    console.error('[VIDEO GENERATE]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to create video jobs' },
      { status: 500 }
    );
  }
}
