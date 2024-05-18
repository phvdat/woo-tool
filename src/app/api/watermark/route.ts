import * as XLSX from 'xlsx';
import { createReadStream, createWriteStream, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import axios from 'axios';
import sharp from 'sharp';
import _toString from 'lodash/toString';
import archiver from 'archiver';
import TelegramBot from 'node-telegram-bot-api';
import { addMetadata } from '@/helper/add-metadata-image';
import { deleteFolderRecursive } from '@/helper/delete-folder-recursive';


interface SheetData {
  name: string;
  images: string;
}

const formatNameRegex = /[^a-zA-Z0-9\s]/g;

const bot = new TelegramBot(_toString(process.env.TELEGRAM_BOT_TOKEN), { polling: false });

export async function POST(request: Request) {
  try {
    const payload = await request.formData();
    const logoUrl = _toString(payload.get('logoUrl'));
    const logoWidth = Number(payload.get('logoWidth'));
    const logoHeight = Number(payload.get('logoHeight'));
    const imageWidth = Number(payload.get('imageWidth'));
    const imageHeight = Number(payload.get('imageHeight'));
    const idTelegram = _toString(payload.get('idTelegram'));
    const shopName = _toString(payload.get('shopName'));
    const quality = Number(payload.get('quality'));
    const excelFile = payload.get('excelFile');

    // define imagesFolderPath
    const imagesFolderPath = `media/images-${Date.now()}`;
    mkdirSync(imagesFolderPath, { recursive: true });

    // read excelFile with xlsx
    const workbook = XLSX.read(await (excelFile as any).arrayBuffer(), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as SheetData[];
    // check valid collumn name and images excel file
    if (!data[0].hasOwnProperty('name') || !data[0].hasOwnProperty('images')) {
      return Response.json('Invalid excel file', { status: 400 });
    }

    // get logo image
    const logoResponse = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
    });
    const resizedLogo = await sharp(logoResponse.data).resize(logoWidth, logoHeight).toBuffer();

    for (const item of data) {
      const originName = item['name'];
      const name = originName.replace(formatNameRegex, '');
      const imagesList = item['images'].split(',');
      const folderPath = `${imagesFolderPath}/${name}`;
      mkdirSync(folderPath, { recursive: true });
      for (let i = 0, len = imagesList.length; i < len; i++) {
        const imageUrl = imagesList[i];
        const imageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;
        const imagePath = `${folderPath}/${imageName}`;
        try {
          const { data: imageResponse } = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
          })

          const buffer = await sharp(imageResponse).resize(imageWidth, imageHeight)
            .composite([{ input: resizedLogo, gravity: 'southeast' }]).jpeg({ quality }).toBuffer();
          writeFileSync(imagePath, buffer);
          addMetadata({ name, shopName, imagePath });
        } catch (error) {
          console.error("error get " + imageName, error);
          continue;
        }
      }
    }

    const zipFileName = `images-${Date.now()}.zip`;
    const zipFilePath = `./media/${zipFileName}`;
    // archiver
    const output = createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => {
      try {
        const stream = createReadStream(zipFilePath);
        bot.sendDocument(idTelegram, stream, {
          caption: `Images for ${shopName}`,
        }).then(() => {
          // delete folder and zip file
          unlinkSync(zipFilePath);
          deleteFolderRecursive(imagesFolderPath);
        }
        );
      } catch (error) {
        console.error('error sendDocument', error);
      }
    });
    archive.pipe(output);
    archive.directory(imagesFolderPath, false);
    archive.finalize();
    return Response.json('Successfully', { status: 200 });
  } catch (error) {
    console.log('error router handler', error);

    return Response.json(error, { status: 500 });
  }
}
