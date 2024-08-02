import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';
import { storage } from '@/lib/firebase';
import axios from 'axios';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import moment from 'moment';
import sharp from 'sharp';

interface CreateWatermarkParam {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  shopName: string;
  quality: number;
  images: string[];
  name: string;
}

const formatNameRegex = /[^a-zA-Z0-9\s]/g;

export async function CreateWatermark({
  logoUrl,
  logoWidth,
  logoHeight,
  imageWidth,
  imageHeight,
  shopName,
  quality,
  images,
  name: originName,
}: CreateWatermarkParam) {
  const imagesFolderPath = `public/media`;
  mkdirSync(imagesFolderPath, { recursive: true });

  try {
    const logoResponse = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
    });
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
          return;
        }
        const { data: imageResponse } = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });

        const buffer = await sharp(imageResponse)
          .resize(imageWidth, imageHeight)
          .composite([{ input: resizedLogo, gravity: 'southeast' }])
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
        console.error('error get ' + imageName, error);
        throw error;
      }
    }
    deleteFolderRecursive(imagesFolderPath);
    return imageUrlList;
  } catch (error) {
    console.error('error create watermark', error);
    throw error;
  }
}
