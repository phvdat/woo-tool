import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';
import axios from 'axios';
import { mkdirSync, writeFileSync } from 'fs';
import _toString from 'lodash/toString';
import sharp from 'sharp';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import moment from 'moment';

const formatNameRegex = /[^a-zA-Z0-9\s]/g;

export async function POST(request: Request) {
  const date = moment().format('YYYY-MM-DD-HH-mm-ss');
  const imagesFolderPath = `media/images-${date}`;
  try {
    const payload = await request.formData();
    const logoUrl = _toString(payload.get('logoUrl'));
    const logoWidth = Number(payload.get('logoWidth'));
    const logoHeight = Number(payload.get('logoHeight'));
    const imageWidth = Number(payload.get('imageWidth'));
    const imageHeight = Number(payload.get('imageHeight'));
    const shopName = _toString(payload.get('shopName'));
    const quality = Number(payload.get('quality'));
    const imagesUrlInRow = _toString(payload.get('images'));
    const originName = _toString(payload.get('name'));

    mkdirSync(imagesFolderPath, { recursive: true });

    const logoResponse = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
    });
    const resizedLogo = await sharp(logoResponse.data)
      .resize(logoWidth, logoHeight)
      .toBuffer();

    const name = originName.replace(formatNameRegex, '');
    const imagesList = imagesUrlInRow.split(',');
    const folderPath = `${imagesFolderPath}/${name}`;
    mkdirSync(folderPath, { recursive: true });
    for (let i = 0, len = imagesList.length; i < len; i++) {
      const imageUrl = imagesList[i];
      const imageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;
      const imagePath = `${folderPath}/${imageName}`;
      try {
        const { data: imageResponse } = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });

        const buffer = await sharp(imageResponse)
          .resize(imageWidth, imageHeight)
          .composite([{ input: resizedLogo, gravity: 'southeast' }])
          .jpeg({ quality })
          .toBuffer();
        writeFileSync(imagePath, buffer);
        addMetadata({ name, shopName, imagePath });
        // upload imagePath to firebase storage
        const storageRef = ref(storage, `woo-image/${date}/${imagePath}`);
        const bufferImage = await sharp(imagePath).toBuffer();
        const response = await uploadBytes(storageRef, bufferImage);
        console.log('response', response);
      } catch (error) {
        console.error('error get ' + imageName, error);
        continue;
      }
    }

    deleteFolderRecursive(imagesFolderPath);
    return Response.json('Successfully', { status: 200 });
  } catch (error) {
    console.log('error router handler', error);
    deleteFolderRecursive(imagesFolderPath);
    return Response.json(error, { status: 500 });
  }
}
