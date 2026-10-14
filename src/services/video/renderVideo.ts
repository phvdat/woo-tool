import ffmpeg from 'fluent-ffmpeg';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { VIDEO_CONFIG, VIDEO_PATHS } from './config';

// Allow override for testing
const OUTPUT_BASE = process.env.VIDEO_OUTPUT_BASE || VIDEO_PATHS.OUTPUT_BASE;
import { selectBackgroundForVideo } from './backgroundSelect';

export interface RenderVideoParams {
  jobId: string;
  productId: string;
  frameDir: string;
  frameCount: number;
  displayDuration: number;
  transitionDuration: number;
  kenBurns: boolean;
  backgroundMusicPath: string | null;
  backgroundPaths?: string[];
  onProgress?: (percent: number) => void;
  showCta?: boolean;
}

export interface RenderVideoResult {
  outputPath: string;
  backgroundPath: string | null;
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
  backgroundPaths,
  onProgress,
  showCta = VIDEO_CONFIG.DEFAULT_CTA_ENABLED,
}: RenderVideoParams): Promise<RenderVideoResult> {
  return new Promise(async (resolve, reject) => {
    try {
    if (frameCount === 0) {
      reject(new Error('No frames to render'));
      return;
    }

    const outputDir = path.join(OUTPUT_BASE, jobId);
    mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `product-${productId}${VIDEO_CONFIG.OUTPUT_EXTENSION}`);

    const command = ffmpeg();

    let inputIndex = 0;
    for (let i = 0; i < frameCount; i++) {
      const framePath = path.join(frameDir, `frame-${String(i).padStart(4, '0')}.jpg`);
      command.input(framePath).inputOptions(['-loop', '1']);
      inputIndex++;
    }

    const backgrounds = (backgroundPaths || []).filter(Boolean);
    const backgroundIndex = selectBackgroundForVideo(backgrounds.length);
    const backgroundPath = backgroundIndex >= 0 ? backgrounds[backgroundIndex] : null;
    const backgroundInputForScene: number[] = [];
    let backgroundInputCount = 0;
    const backgroundInputStartIndex = inputIndex;

    for (let i = 0; i < frameCount; i++) {
      if (backgroundPath) {
        command.input(backgroundPath).inputOptions(['-loop', '1']);
        backgroundInputForScene.push(backgroundInputStartIndex + backgroundInputCount);
        backgroundInputCount++;
        inputIndex++;
      } else {
        backgroundInputForScene.push(-1);
      }
    }

    const filterComplex: string[] = [];
    const fps = VIDEO_CONFIG.OUTPUT_FPS;
    const framesPerImage = Math.round(displayDuration * fps);
    const actualClipDuration = framesPerImage / fps;
    const totalDuration = frameCount * actualClipDuration - (frameCount - 1) * transitionDuration;
    const W = VIDEO_CONFIG.OUTPUT_WIDTH;
    const H = VIDEO_CONFIG.OUTPUT_HEIGHT;
    // Opening: background-only hook, then a product intro that doubles as the
    // clear -> blur+darken background transition. Clamped so short videos still
    // end on a settled frame.
    const openingTotal = Math.min(
      VIDEO_CONFIG.OPENING_HOOK_DURATION + VIDEO_CONFIG.OPENING_INTRO_DURATION,
      totalDuration * 0.8
    );
    const openingHook =
      (openingTotal * VIDEO_CONFIG.OPENING_HOOK_DURATION) /
      (VIDEO_CONFIG.OPENING_HOOK_DURATION + VIDEO_CONFIG.OPENING_INTRO_DURATION);

    for (let i = 0; i < frameCount; i++) {
      const inputLabel = `${i}:v`;
      const backgroundInput = backgroundInputForScene[i];
      const sceneStart = i * (actualClipDuration - transitionDuration);
      // Round before gating: a scene starting exactly at the hook end can land
      // at -1e-16 from float error and would otherwise lose the opening.
      const hookLocal = Number((openingHook - sceneStart).toFixed(3));
      const introEndLocal = Number((openingTotal - sceneStart).toFixed(3));
      const hasOpening =
        backgroundInput >= 0 && introEndLocal > 0.001 && hookLocal >= 0;
      const hookStr = hookLocal.toFixed(3);
      const introStr = (introEndLocal - hookLocal).toFixed(3);

      if (backgroundInput >= 0) {
        // Vertical repeat: fill-crop one tile, stack a second copy under it,
        // then slide an H-tall window up the 2H strip (shrinking y reads as
        // downward motion). y walks H->0 and jumps back to H; the strip
        // repeats with period H, so the jump and every tile exit are
        // pixel-identical (seamless loop). sceneStart keeps the position on
        // the global timeline, so it never jumps at scene boundaries.
        const scrollY = (startSeconds: number) => {
          const off =
            `${(startSeconds * VIDEO_CONFIG.BACKGROUND_SCROLL_SPEED).toFixed(6)}` +
            `+t*${VIDEO_CONFIG.BACKGROUND_SCROLL_SPEED}`;
          return `(floor(${off})+1-(${off}))*${H}`;
        };
        const bgScale =
          `[${backgroundInput}:v]` +
          `scale=${W}:${H}:force_original_aspect_ratio=increase,` +
          `crop=${W}:${H},` +
          // Loop inputs tick at 25fps; normalize so the scroll position
          // advances evenly on output frames.
          `fps=${fps}`;

        if (hasOpening) {
          // Clear until the hook ends, then dissolve into blur+darken. Offsets
          // are local to this scene but measured from the global timeline so
          // the dissolve stays continuous across scene transitions.
          // xfade time-shifts its second input by `offset`, so the treated
          // branch's frames land hookLocal late on the output timeline; each
          // branch therefore gets its own scroll crop, with the treated one
          // starting hookLocal ahead, or the two dissolve layers (and the
          // scenes after them) drift apart.
          filterComplex.push(
            `${bgScale},split=4[bgC0${i}][bgC1${i}][bgB0${i}][bgB1${i}]`
          );
          filterComplex.push(
            `[bgC0${i}][bgC1${i}]vstack=inputs=2,` +
            `crop=${W}:${H}:x=0:y='${scrollY(sceneStart)}'[bgClr${i}]`
          );
          filterComplex.push(
            `[bgB0${i}][bgB1${i}]vstack=inputs=2,` +
            `crop=${W}:${H}:x=0:y='${scrollY(sceneStart + hookLocal)}'[bgTrt${i}]`
          );
          filterComplex.push(
            `[bgTrt${i}]` +
            `gblur=sigma=${VIDEO_CONFIG.BACKGROUND_BLUR_SIGMA},` +
            `eq=brightness=${VIDEO_CONFIG.BACKGROUND_DARKEN}` +
            `[bgTreat${i}]`
          );
          filterComplex.push(
            `[bgClr${i}][bgTreat${i}]xfade=transition=fade:duration=${introStr}:offset=${hookStr}[bgP${i}]`
          );
        } else {
          filterComplex.push(
            `${bgScale},` +
            `split=2[bgT0${i}][bgT1${i}];` +
            `[bgT0${i}][bgT1${i}]vstack=inputs=2,` +
            `crop=${W}:${H}:x=0:y='${scrollY(sceneStart)}',` +
            `gblur=sigma=${VIDEO_CONFIG.BACKGROUND_BLUR_SIGMA},` +
            `eq=brightness=${VIDEO_CONFIG.BACKGROUND_DARKEN}` +
            `[bgP${i}]`
          );
        }
      } else {
        // Split foreground/background
        filterComplex.push(
          `[${inputLabel}]split=2[bg${i}][fg${i}]`
        );

        // Background
        filterComplex.push(
          `[bg${i}]` +
          `scale=${W}:${H}:force_original_aspect_ratio=increase,` +
          `crop=${W}:${H},` +
          `gblur=sigma=${VIDEO_CONFIG.FALLBACK_BACKGROUND_BLUR_SIGMA},` +
          `eq=brightness=${VIDEO_CONFIG.BACKGROUND_DARKEN}` +
          `[bgP${i}]`
        );
      }

      // Foreground
      const fgSource = backgroundInput >= 0 ? inputLabel : `fg${i}`;
      filterComplex.push(
        `[${fgSource}]` +
        `scale=${W}:${H}:force_original_aspect_ratio=decrease` +
        `[fgS${i}]`
      );

      if (hasOpening) {
        // Product reveal: invisible during the hook, then one dissolve does
        // fade-in + settle from a slightly smaller, softer state to final.
        const soft = VIDEO_CONFIG.OPENING_PRODUCT_BLUR_SIGMA;
        const start = VIDEO_CONFIG.OPENING_PRODUCT_START_SCALE;
        filterComplex.push(`[fgS${i}]split=2[fgInSrc${i}][fgFinSrc${i}]`);
        filterComplex.push(
          `[fgInSrc${i}]` +
          `scale=iw*${start}:ih*${start},` +
          `format=rgba,` +
          `boxblur=${soft}:1:${soft}:1:${soft}:1,` +
          `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black@0` +
          `[fgIntro${i}]`
        );
        filterComplex.push(
          `[fgFinSrc${i}]format=rgba,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black@0[fgFinal${i}]`
        );
        filterComplex.push(
          `[fgIntro${i}][fgFinal${i}]xfade=transition=fade:duration=${introStr}:offset=${hookStr}[fgMix${i}]`
        );
        filterComplex.push(
          `[fgMix${i}]fade=t=in:st=${hookStr}:d=${introStr}:alpha=1[fgP${i}]`
        );
        filterComplex.push(
          `[bgP${i}][fgP${i}]` +
          `overlay=0:0` +
          `[c${i}]`
        );
      } else {
        // Composite
        filterComplex.push(
          `[bgP${i}][fgS${i}]` +
          `overlay=(W-w)/2:(H-h)/2` +
          `[c${i}]`
        );
      }

      if (kenBurns) {
        const zoomScale = 1.06;
        const upscale = 2;
        const zoomIncrement = (zoomScale - 1) / framesPerImage;

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
          `[c${i}]scale=${W * upscale}:${H * upscale}:flags=lanczos[c${i}hi]`
        );

        filterComplex.push(`[c${i}hi]fps=${fps}[c${i}f]`);

        filterComplex.push(
          `[c${i}f]` +
          `zoompan=` +
          `z='min(1+${zoomIncrement.toFixed(6)}*(on+1),${zoomScale})':` +
          `x=${panX}:` +
          `y=${panY}:` +
          `d=1:` +
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
        const offset = i * actualClipDuration - transitionDuration * i;
        const outLabel = i === frameCount - 1 ? 'outv' : `xf${i}`;

        filterComplex.push(
          `[${currentLabel}][${nextLabel}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outLabel}]`
        );
        currentLabel = outLabel;
      }
    }

    // Prepare CTA overlay if requested
    let ctaEnabled = false;
    let ctaInputIndex = -1;
    if (showCta) {
      try {
        const ctaText = 'PRODUCT LINK IN COMMENTS';
        const ctaSvg = `<svg width="${W}" height="80">
          <text x="${W / 2}" y="50" font-size="44" font-family="Arial" font-weight="bold" text-anchor="middle" fill="white" stroke="black" stroke-width="3">${ctaText}</text>
        </svg>`;
        const ctaOverlayPath = path.join(outputDir, `cta-${jobId}.png`);
        await sharp(Buffer.from(ctaSvg)).png().toFile(ctaOverlayPath);
        if (existsSync(ctaOverlayPath)) {
          command.input(ctaOverlayPath);
          ctaInputIndex = inputIndex++;
          ctaEnabled = true;
        } else {
          console.error('[VIDEO CTA] Failed to create CTA overlay: file does not exist after write');
        }
      } catch (err) {
        console.error(`[VIDEO CTA] Failed to create CTA overlay: ${err}`);
      }
    }

    // Build filter graph after all inputs are added
    let fullFilter = filterComplex.join(';');
    if (ctaEnabled && ctaInputIndex >= 0) {
      const ctaEnable = `between(t,${Math.max(totalDuration - 3, 0).toFixed(3)},${totalDuration.toFixed(3)})`;
      fullFilter = fullFilter + `;[${ctaInputIndex}:v]setpts=PTS-STARTPTS[cta];[outv][cta]overlay=0:${H - 80 - 40}:enable='${ctaEnable}'[outvfinal]`;
    }

    command
      .complexFilter(fullFilter)
      .outputOptions([
        '-map', ctaEnabled ? '[outvfinal]' : '[outv]',
        '-c:v', VIDEO_CONFIG.OUTPUT_CODEC,
        '-pix_fmt', VIDEO_CONFIG.OUTPUTPixelFormat,
        '-t', String(totalDuration),
        '-movflags', '+faststart',
        '-y',
      ]);

    if (backgroundMusicPath) {
      const audioInputIndex = inputIndex++;
      command.input(backgroundMusicPath);
      command.outputOptions(['-map', `${audioInputIndex}:a`, '-shortest']);
    }

    command
      .output(outputPath)
      .on('progress', (progress) => {
        if (onProgress && progress.percent !== undefined) {
          onProgress(Math.min(Math.round(progress.percent), 99));
        }
      })
      .on('end', () => {
        resolve({ outputPath, backgroundPath });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
    } catch (err) {
      reject(err);
    }
  });
}
