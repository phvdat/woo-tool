import { CreateWatermark } from '@/helper/watermark';
import { createWooRecord, WooFixedOption } from '@/helper/woo';
import { WooCommerce } from '@/types/woo';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import _get from 'lodash/get';
import _toString from 'lodash/toString';
import moment from 'moment';
import TelegramBot from 'node-telegram-bot-api';
import * as XLSX from 'xlsx';
import {
  CATEGORIES_COLLECTION,
  WooCategoryPayload,
} from '../categories-config/route';
import { WooWatermarkPayload } from '../watermark-config/route';
import dayjs from 'dayjs';
import axios from 'axios';
import { getSocket } from '@/config/socket';
import { connectToDatabase } from '@/lib/mongodb';

const socket = getSocket();
socket.connect();

interface SheetData {
  Name: string;
  Images: string;
  Contain?: string;
}

const bot = new TelegramBot(_toString(process.env.TELEGRAM_BOT_TOKEN), {
  polling: false,
});

export async function POST(request: Request) {
  let { db } = await connectToDatabase();
  const categoriesList = await db
    .collection(CATEGORIES_COLLECTION)
    .find()
    .toArray();

  const payload = await request.formData();

  const file = payload.get('file') as File;
  const categoriesObject = JSON.parse(
    _toString(payload.get('categoriesObject'))
  ) as WooCategoryPayload;
  const watermarkObject = JSON.parse(
    _toString(payload.get('watermarkObject'))
  ) as WooWatermarkPayload;
  const telegramId = payload.get('telegramId') as string;
  const publicTime = Number(payload.get('publicTime'));
  const gapMinutes = Number(payload.get('gapMinutes'));
  const socketId = Number(payload.get('socketId'));
  let publishedDate = dayjs().add(publicTime, 'minute');

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(wordSheet) as SheetData[];
    if (!data[0].hasOwnProperty('Name') || !data[0].hasOwnProperty('Images')) {
      return Response.json({ message: 'Invalid excel file' }, { status: 400 });
    }
    const result: WooCommerce[] = [];
    const logoResponse = await axios.get(watermarkObject.logoUrl, {
      responseType: 'arraybuffer',
    });
    for (const row of data) {
      const rowData = row as any;
      const name: string = rowData['Name'];
      const fit = rowData['Fit'];
      if (!rowData['Images']) {
        continue;
      }
      let categoryObjectByRow = null;
      if (rowData['Categories']) {
        categoryObjectByRow = categoriesList.find(
          (item) => item.category === rowData['Categories']
        ) as unknown as WooFixedOption;
      }
      const imageUrls: string[] = rowData['Images'].split(',');

      const urlImageList = await CreateWatermark({
        imageHeight: Number(watermarkObject.imageHeight),
        imageWidth: Number(watermarkObject.imageWidth),
        logoHeight: Number(watermarkObject.logoHeight),
        logoWidth: Number(watermarkObject.logoWidth),
        quality: Number(watermarkObject.quality),
        shopName: watermarkObject.shopName,
        images: imageUrls,
        name: name,
        fit: fit,
        logoResponse,
      });

      const formattedPublishedDate = publishedDate.format(
        'YYYY-MM-DD HH:mm:ss'
      );
      result.push(
        createWooRecord(categoryObjectByRow || categoriesObject, {
          ...rowData,
          images: urlImageList.join(','),
          name: name,
          ...(publicTime
            ? {
                'published Date': formattedPublishedDate,
              }
            : {}),
        })
      );
      publishedDate = publishedDate.add(
        gapMinutes * 60 + Math.floor(Math.random() * 20),
        'seconds'
      );
      const progress = Math.floor((result.length / data.length) * 100);
      socket.emit('woo-progress', {
        progress,
        socketId,
      });
    }
    // create excel from result and send file to telegram id by bot
    const ws = XLSX.utils.json_to_sheet(result);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'result');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    const date = moment().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `woo-${
      watermarkObject.shopName.split('.')[0]
    }-${date}.csv`;
    writeFileSync(fileName, buffer);
    const stream = createReadStream(fileName);
    bot
      .sendDocument(telegramId, stream, {
        caption: `Here is your file: ${fileName}`,
      })
      .then(() => {
        unlinkSync(fileName);
      });
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.log('error api woo', error);
    socket.emit('woo-error', { error, socketId });
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
