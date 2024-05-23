import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';
import axios from 'axios';
import { mkdirSync, writeFileSync } from 'fs';
import _toString from 'lodash/toString';
import sharp from 'sharp';
import { storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import moment from 'moment';
import _get from 'lodash/get';

const formatNameRegex = /[^a-zA-Z0-9\s]/g;

export async function POST(request: Request) {
  const payload = await request.json();
  const date = moment().format('YYYY-MM-DD-HH-mm-ss');
  const imagesFolderPath = `media`;
  try {
    const logoUrl = _toString(_get(payload, 'logoUrl', ''));
    const logoWidth = Number(_get(payload, 'logoWidth'));
    const logoHeight = Number(_get(payload, 'logoHeight'));
    const imageWidth = Number(_get(payload, 'imageWidth'));
    const imageHeight = Number(_get(payload, 'imageHeight'));
    const shopName = _toString(_get(payload, 'shopName'));
    const quality = Number(_get(payload, 'quality'));
    const imagesUrlInRow = _toString(_get(payload, 'images'));
    const originName = _toString(_get(payload, 'name'));

    mkdirSync(imagesFolderPath, { recursive: true });

    const logoResponse = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
    });
    const resizedLogo = await sharp(logoResponse.data)
      .resize(logoWidth, logoHeight)
      .toBuffer();
    const name = originName.replace(formatNameRegex, '');
    const imagesList = imagesUrlInRow.split(',');
    const imageUrlList = [];
    for (let i = 0, len = imagesList.length; i < len; i++) {
      const imageUrl = imagesList[i];
      const imageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;
      const imagePath = `${imagesFolderPath}/${imageName}`;
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
        const storageRef = ref(storage, `woo-image/${date}/${imageName}`);
        const bufferImage = await sharp(imagePath).toBuffer();
        await uploadBytes(storageRef, bufferImage);
        const urlImage = await getDownloadURL(storageRef);
        console.log('urlImage', urlImage);
        imageUrlList.push(urlImage);
      } catch (error) {
        console.error('error get ' + imageName, error);
        continue;
      }
    }

    deleteFolderRecursive(imagesFolderPath);
    return Response.json(imageUrlList, { status: 200 });
  } catch (error) {
    console.log('error router handler', error);
    deleteFolderRecursive(imagesFolderPath);
    return Response.json(error, { status: 500 });
  }
}
