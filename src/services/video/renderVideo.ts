import ffmpeg from 'fluent-ffmpeg';
import { mkdirSync } from 'fs';
import path from 'path';
import { VIDEO_CONFIG, VIDEO_PATHS } from './config';

export interface RenderVideoParams {
  jobId: string;
  productId: string;
  frameDir: string;
  frameCount: number;
  displayDuration: number;
  transitionDuration: number;
  kenBurns: boolean;
  backgroundMusicPath: string | null;
  onProgress?: (percent: number) => void;
}

export interface RenderVideoResult {
  outputPath: string;
}

export function renderVideo({
  jobId,
  productId,
  frameDir,
  frameCount,
  displayDuration,
  transitionDuration,
  kenBurns,
  backgroundMusicPath,
  onProgress,
}: RenderVideoParams): Promise<RenderVideoResult> {
  return new Promise((resolve, reject) => {
    if (frameCount === 0) {
      reject(new Error('No frames to render'));
      return;
    }

    const outputDir = path.join(VIDEO_PATHS.OUTPUT_BASE, jobId);
    mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `product-${productId}${VIDEO_CONFIG.OUTPUT_EXTENSION}`);

    const command = ffmpeg();

    for (let i = 0; i < frameCount; i++) {
      const framePath = path.join(frameDir, `frame-${String(i).padStart(4, '0')}.jpg`);
      command.input(framePath).inputOptions(['-loop', '1']);
    }

    const totalDuration = frameCount * displayDuration;
    const filterComplex: string[] = [];
    const fps = VIDEO_CONFIG.OUTPUT_FPS;
    const framesPerImage = Math.round(displayDuration * fps);
    const W = VIDEO_CONFIG.OUTPUT_WIDTH;
    const H = VIDEO_CONFIG.OUTPUT_HEIGHT;

    for (let i = 0; i < frameCount; i++) {
      const inputLabel = `${i}:v`;

      // Split foreground/background
      filterComplex.push(
        `[${inputLabel}]split=2[bg${i}][fg${i}]`
      );

      // Background
      filterComplex.push(
        `[bg${i}]` +
        `scale=${W}:${H}:force_original_aspect_ratio=increase,` +
        `crop=${W}:${H},` +
        `gblur=sigma=30,` +
        `eq=brightness=-0.05` +
        `[bgP${i}]`
      );

      // Foreground
      filterComplex.push(
        `[fg${i}]` +
        `scale=${W}:${H}:force_original_aspect_ratio=decrease` +
        `[fgS${i}]`
      );

      // Composite
      filterComplex.push(
        `[bgP${i}][fgS${i}]` +
        `overlay=(W-w)/2:(H-h)/2` +
        `[c${i}]`
      );

      if (kenBurns) {
        const zoomScale = 1.06;

        const panX =
          i % 3 === 0
            ? 'iw/2-(iw/zoom/2)'
            : i % 3 === 1
              ? 'iw-(iw/zoom)'
              : '0';

        const panY =
          i % 3 === 1
            ? 'ih/2-(ih/zoom/2)'
            : i % 3 === 2
              ? 'ih-(ih/zoom)'
              : '0';

        filterComplex.push(
          `[c${i}]` +
          `zoompan=` +
          `z='min(zoom+0.0008,${zoomScale})':` +
          `x=${panX}:` +
          `y=${panY}:` +
          `d=${framesPerImage}:` +
          `s=${W}x${H}:` +
          `fps=${fps}` +
          `[v${i}]`
        );
      } else {
        filterComplex.push(
          `[c${i}]fps=${fps},` +
          `trim=duration=${displayDuration},` +
          `setpts=PTS-STARTPTS` +
          `[v${i}]`
        );
      }
    }

    if (frameCount === 1) {
      filterComplex.push('[v0]null[outv]');
    } else {
      let currentLabel = 'v0';

      for (let i = 1; i < frameCount; i++) {
        const nextLabel = `v${i}`;
        const offset = i * displayDuration - transitionDuration * i;
        const outLabel = i === frameCount - 1 ? 'outv' : `xf${i}`;

        filterComplex.push(
          `[${currentLabel}][${nextLabel}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outLabel}]`
        );
        currentLabel = outLabel;
      }
    }

    const fullFilter = filterComplex.join(';');

    console.log('========== FILTER ==========');
    console.log(fullFilter);
    console.log('============================');

    command
      .complexFilter(fullFilter)
      .outputOptions([
        '-map', '[outv]',
        '-c:v', VIDEO_CONFIG.OUTPUT_CODEC,
        '-pix_fmt', VIDEO_CONFIG.OUTPUTPixelFormat,
        '-t', String(totalDuration),
        '-movflags', '+faststart',
        '-y',
      ]);

    if (backgroundMusicPath) {
      const audioIndex = frameCount;
      command.input(backgroundMusicPath);
      command.outputOptions(['-map', `${audioIndex}:a`, '-shortest']);
    }

    command
      .output(outputPath)
      .on('progress', (progress) => {
        if (onProgress && progress.percent !== undefined) {
          onProgress(Math.min(Math.round(progress.percent), 99));
        }
      })
      .on('end', () => {
        resolve({ outputPath });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}
