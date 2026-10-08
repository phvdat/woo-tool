import sharp from "sharp";
import { VIDEO_CONFIG } from "./config";

export interface ThumbnailParams {
  productImagePath: string;
  backgroundPath: string | null;
  outputPath: string;
}

export interface ThumbnailProductBox {
  width: number;
  height: number;
  top: number;
  left: number;
}

export function computeThumbnailProductBox(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): ThumbnailProductBox {
  const maxWidth = Math.floor(
    canvasWidth * VIDEO_CONFIG.THUMBNAIL_PRODUCT_MAX_WIDTH_RATIO
  );
  const maxHeight = Math.floor(
    canvasHeight * VIDEO_CONFIG.THUMBNAIL_PRODUCT_MAX_HEIGHT_RATIO
  );
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const padding = Math.round(
    canvasWidth * VIDEO_CONFIG.THUMBNAIL_PADDING_RATIO
  );

  return {
    width: Math.max(1, Math.round(imageWidth * scale)),
    height: Math.max(1, Math.round(imageHeight * scale)),
    top: padding,
    left: padding,
  };
}

export async function generateThumbnail(
  params: ThumbnailParams
): Promise<string> {
  const { productImagePath, backgroundPath, outputPath } = params;
  const width = VIDEO_CONFIG.OUTPUT_WIDTH;
  const height = VIDEO_CONFIG.OUTPUT_HEIGHT;

  const productMeta = await sharp(productImagePath).metadata();
  if (!productMeta.width || !productMeta.height) {
    throw new Error("Cannot read product image dimensions");
  }

  const box = computeThumbnailProductBox(
    productMeta.width,
    productMeta.height,
    width,
    height
  );

  const backdrop = backgroundPath
    ? sharp(backgroundPath).resize(width, height, { fit: "cover" })
    : sharp(productImagePath)
        .resize(width, height, { fit: "cover" })
        .blur(VIDEO_CONFIG.FALLBACK_BACKGROUND_BLUR_SIGMA)
        .linear(1, VIDEO_CONFIG.BACKGROUND_DARKEN * 255);

  const product = await sharp(productImagePath)
    .resize(box.width, box.height, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  // Materialize the backdrop first: sharp applies blur/linear after any
  // composite in the same pipeline, which would soften the product overlay.
  const backdropBuffer = await backdrop.png().toBuffer();

  await sharp(backdropBuffer)
    .composite([{ input: product, top: box.top, left: box.left }])
    .jpeg({ quality: VIDEO_CONFIG.THUMBNAIL_QUALITY })
    .toFile(outputPath);

  return outputPath;
}
