import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';
import { storage } from '@/lib/firebase';
import axios from 'axios';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import moment from 'moment';
import sharp from 'sharp';

interface CreateWatermarkParam {
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

export async function CreateWatermark({
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
}: CreateWatermarkParam) {
  const imagesFolderPath = `public/media`;
  mkdirSync(imagesFolderPath, { recursive: true });

  try {
    const resizedLogo = await sharp(logoResponse.data)
      .resize(logoWidth, logoHeight)
      .toBuffer();
    const name = originName.replace(formatNameRegex, '');
    const imageUrlList = [];
    for (let i = 0, len = images.length; i < len; i++) {
      const imageUrl = images[i];
      const imageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;
      const imagePath = `${imagesFolderPath}/${imageName}`;
      try {
        if (!imageUrl) {
          continue;
        }
        const { data: imageResponse } = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });

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
        writeFileSync(imagePath, buffer);
        await addMetadata({ name, shopName, imagePath });
        // upload imagePath to firebase storage
        const date = moment().format('YYYY-MM-DD');
        const storageRef = ref(storage, `woo-image/${date}/${imageName}`);
        const fileImage = readFileSync(imagePath);
        const blob = new Blob([fileImage], { type: 'image/jpeg' });
        await uploadBytes(storageRef, blob);
        const urlImage = await getDownloadURL(storageRef);
        imageUrlList.push(urlImage);
      } catch (error) {
        throw error;
      }
    }
    deleteFolderRecursive(imagesFolderPath);
    return imageUrlList;
  } catch (error) {
    throw error;
  }
}
