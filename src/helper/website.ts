import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';
import axios from 'axios';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';
import path from 'path';

interface CreateWebsiteParam {
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  shopName: string;
  quality: number;
  images: string[];
  name: string;
  fit: 'contain' | 'cover' | 'fill';
  logoResponse: any;
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
  fit,
  logoResponse,
}: CreateWebsiteParam) {
  const tempFolder = `public/media-temp`;
  const uploadFolder = `public/uploads/${shopName.replace('.com', '')}`;

  mkdirSync(tempFolder, { recursive: true });
  mkdirSync(uploadFolder, { recursive: true });

  try {
    const resizedLogo = await sharp(logoResponse.data)
      .resize(logoWidth, logoHeight)
      .toBuffer();

    const name = originName.replace(formatNameRegex, '');
    const imageUrlList: string[] = [];

    for (let i = 0, len = images.length; i < len; i++) {
      const imageUrl = images[i];
      const imageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;

      if (!imageUrl) continue;

      try {
        // Download ảnh gốc
        const { data: imageResponse } = await axios.get(imageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          responseType: 'arraybuffer',
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        // Resize + watermark
        const buffer = await sharp(imageResponse)
          .resize({
            width: imageWidth,
            height: imageHeight,
            fit: fit || 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .composite([{ input: resizedLogo, gravity: 'center' }])
          .jpeg({ quality })
          .toBuffer();

        const tempPath = `${tempFolder}/${imageName}`;
        writeFileSync(tempPath, buffer);

        await addMetadata({ name, shopName, imagePath: tempPath });

        const finalPath = path.join(uploadFolder, imageName);
        writeFileSync(finalPath, readFileSync(tempPath));

        const url = `${process.env.NEXTAUTH_URL}/uploads/${shopName.replace(
          '.com',
          ''
        )}/${imageName}`;
        imageUrlList.push(url);
      } catch (error) {
        console.error('Error processing image:', error);
        throw error;
      }
    }

    // Xóa folder temp
    deleteFolderRecursive(tempFolder);

    return imageUrlList;
  } catch (error) {
    console.log('create website', error);
    return images;
  }
}
