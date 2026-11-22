import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';
import {
  downloadRemoteImage,
  RemoteImageDownloadError,
} from '@/helper/downloadRemoteImage';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import sharp from 'sharp';
import path from 'path';

function getUniqueFileName(folder: string, baseName: string) {
  let counter = 1;

  const ext = path.extname(baseName);
  const nameWithoutExt = path.basename(baseName, ext);

  let finalName = baseName;

  while (existsSync(path.join(folder, finalName))) {
    finalName = `${nameWithoutExt}-${counter}${ext}`;
    counter++;
  }

  return finalName;
}
interface CreateWebsiteParam {
  logoWidth?: number;
  logoHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
  shopName: string;
  quality: number;
  images: string[];
  name: string;
  position?: string;
  logoResponse: any;
  category: string;
  uploadFolder: string
}

const formatNameRegex = /[^a-zA-Z0-9\s]/g;

export async function addWatermark({
  logoWidth,
  logoHeight,
  imageWidth,
  imageHeight,
  shopName,
  quality,
  images,
  name: originName,
  position,
  logoResponse,
  category,
  uploadFolder
}: CreateWebsiteParam) {
  const tempFolder = `/tmp/media-temp/${shopName}/${Date.now()}`;

  mkdirSync(tempFolder, { recursive: true });
  mkdirSync(uploadFolder, { recursive: true });

  try {
    const name = originName.replace(formatNameRegex, '');
    const list: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const baseImageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;
      const imageName = getUniqueFileName(uploadFolder, baseImageName);

      if (!imageUrl) continue;

      try {
        const { buffer: imageResponse } = await downloadRemoteImage(imageUrl);

        // Lấy metadata ảnh gốc
        const imageSharp = sharp(imageResponse);
        const metadata = await imageSharp.metadata();

        const originalWidth = metadata.width || 1000;
        const originalHeight = metadata.height || 1000;

        const finalImageWidth = imageWidth || originalWidth;
        const finalImageHeight = imageHeight || originalHeight;

        const defaultLogoSize = Math.min(finalImageWidth, finalImageHeight);

        const finalLogoWidth = logoWidth || defaultLogoSize;
        const finalLogoHeight = logoHeight || defaultLogoSize;

        const resizedLogo = await sharp(logoResponse.data)
          .resize(finalLogoWidth, finalLogoHeight)
          .toBuffer();

        // Resize + watermark
        const buffer = await imageSharp
          .resize({
            width: finalImageWidth,
            height: finalImageHeight,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .composite([{ input: resizedLogo, gravity: position }])
          .jpeg({ quality })
          .toBuffer();

        const tempPath = path.join(tempFolder, imageName);
        writeFileSync(tempPath, buffer);

        // Add metadata
        await addMetadata({ name, shopName, imagePath: tempPath, category });

        // FINAL PATH (ngoài Next.js)
        const finalPath = path.join(uploadFolder, imageName);
        writeFileSync(finalPath, readFileSync(tempPath));

        // URL TRẢ VỀ CHO CLIENT
        const finalUrl = `${process.env.NEXTAUTH_URL
          }/uploads/${shopName.replace('.com', '')}/${imageName}`;

        list.push(finalUrl);
      } catch (error) {
        const statusLabel =
          error instanceof RemoteImageDownloadError
            ? error.forbidden
              ? 'HTTP 403 Forbidden'
              : error.status
                ? `HTTP ${error.status}`
                : 'network error'
            : error instanceof Error
              ? error.message
              : 'Unknown error';

        console.error(
          `[WATERMARK] Image failed (${statusLabel}) for ${imageUrl}; keeping original URL`,
        );
        list.push(imageUrl);
      }
    }
    return list;
  } catch (error) {
    console.error(`[WATERMARK] Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return images;
  } finally {
    deleteFolderRecursive(tempFolder);
  }
}
