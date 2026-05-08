import { addWatermark } from '@/helper/website';
import archiver from 'archiver';
import axios from 'axios';
import fs, { mkdirSync } from 'fs';
import _toString from 'lodash/toString';
import { NextResponse } from 'next/server';
import path from 'path';
import { WooWebsitePayload } from '../woo/website-config/route';

const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});

export async function POST(request: Request) {
  const payload = await request.formData();

  const jobId = Date.now().toString();
  const uploadFolder = `/var/www/html/uploads/blogs/${jobId}`;

  const zipFolder = `/var/www/html/uploads/zips`;

  mkdirSync(uploadFolder, { recursive: true });
  mkdirSync(zipFolder, { recursive: true });

  const zipFileName = `images-${jobId}.zip`;
  const zipFilePath = path.join(zipFolder, zipFileName);

  const websiteObject = JSON.parse(
    _toString(payload.get('websiteObject'))
  ) as WooWebsitePayload;
  const telegramId = payload.get('telegramId') as string;
  const name = String(payload.get('name'));
  const images = String(payload.get('images'));
  try {
    const logoResponse = await axios.get(websiteObject.logoUrl, {
      responseType: 'arraybuffer',
    });
    const imageUrls: string[] = images.split('\n').map(url => url.trim()).filter(Boolean);

    await addWatermark({
      quality: Number(websiteObject.quality),
      shopName: websiteObject.shopName,
      images: imageUrls,
      name,
      logoResponse,
      category: websiteObject.shopName,
      position: websiteObject.logoPosition,
      uploadFolder,
    });

    const output = fs.createWriteStream(zipFilePath);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(uploadFolder, false);
    await archive.finalize();
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
      archive.on('error', reject);
    });

    const downloadLink = `${process.env.NEXTAUTH_URL}/uploads/zips/${zipFileName}`;
    const message = `Download Now:\n${downloadLink}`;
    await bot.sendMessage(telegramId, message);
    return NextResponse.json({
      success: true,
      link: downloadLink,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
