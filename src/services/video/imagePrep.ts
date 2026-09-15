import axios from 'axios';
import sharp from 'sharp';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { VIDEO_CONFIG, VIDEO_PATHS } from './config';

export interface PrepImagesResult {
  frameDir: string;
  frameCount: number;
}

export async function prepImages(
  jobId: string,
  images: string[]
): Promise<PrepImagesResult> {
  const frameDir = path.join(VIDEO_PATHS.TEMP_BASE, jobId);
  mkdirSync(frameDir, { recursive: true });

  let frameIndex = 0;

  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i];
    if (!imageUrl) continue;

    try {
      const { data: imageData } = await axios.get(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30_000,
      });

      const targetWidth = VIDEO_CONFIG.OUTPUT_WIDTH;
      const targetHeight = VIDEO_CONFIG.OUTPUT_HEIGHT;

      const buffer = await sharp(imageData)
        .jpeg({ quality: 90 })
        .toBuffer();

      const framePath = path.join(frameDir, `frame-${String(frameIndex).padStart(4, '0')}.jpg`);
      writeFileSync(framePath, buffer);
      frameIndex++;
    } catch (error) {
      console.error(`[VIDEO PREP] Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { frameDir, frameCount: frameIndex };
}

export function cleanupTempDir(dirPath: string): void {
  try {
    rmSync(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`[VIDEO PREP] Failed to cleanup temp dir: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
