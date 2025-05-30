import { getSocket } from '@/config/socket';
import { publishedTimeHelper } from '@/helper/common';
import { addWatermark } from '@/helper/website';
import { createWooRecord, WooFixedOption } from '@/helper/woo';
import { connectToDatabase } from '@/lib/mongodb';
import { WooCommerce } from '@/types/woo';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import _get from 'lodash/get';
import _toString from 'lodash/toString';
import moment from 'moment';
import TelegramBot from 'node-telegram-bot-api';
import * as XLSX from 'xlsx';
import { WooCategoryPayload } from '../categories-config/route';
import { WooWebsitePayload } from '../website-config/route';

axiosRetry(axios, {
  retries: 3, // Số lần thử lại tối đa
  retryDelay: (retryCount) => retryCount * 2000, // Tăng thời gian chờ giữa mỗi lần retry
  retryCondition: (error) => {
    return error.response?.status === 520 || !error.response; // Chỉ retry khi lỗi 520 hoặc không có phản hồi
  },
});

const CATEGORIES_COLLECTION = 'categories';

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
  const payload = await request.formData();

  const file = payload.get('file') as File;
  const categoriesObject = payload.get('categoriesObject')
    ? (JSON.parse(
        _toString(payload.get('categoriesObject'))
      ) as WooCategoryPayload)
    : null;

  const watermarkObject = JSON.parse(
    _toString(payload.get('watermarkObject'))
  ) as WooWebsitePayload;
  const telegramId = payload.get('telegramId') as string;
  const publicTime = Number(payload.get('publicTime'));
  const gapFrom = Number(payload.get('gapFrom'));
  const gapTo = Number(payload.get('gapTo'));
  const socketId = Number(payload.get('socketId'));
  const categoriesList = await db
    .collection(CATEGORIES_COLLECTION)
    .find({ shopID: { $regex: watermarkObject._id, $options: 'i' } })
    .toArray();

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
    let i = 0;
    for (const row of data) {
      i += 1;
      const rowData = row as any;
      const name: string = rowData['Name'];
      const fit = rowData['Fit'];
      if (!rowData['Images']) {
        continue;
      }
      let categoryObjectByRow = null;
      if (rowData['Categories']) {
        categoryObjectByRow = categoriesList.find(
          (item: any) => item.category === rowData['Categories']
        ) as unknown as WooFixedOption;
      }
      if (!categoryObjectByRow && !categoriesObject) {
        throw new Error('Missing category');
      }
      const imageUrls: string[] = rowData['Images'].split(',');

      const urlImageList = await addWatermark({
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

      if (!urlImageList) {
        socket.emit('image-get-failed', { line: i, socketId });
      } else {
        result.push(
          createWooRecord(
            categoryObjectByRow || (categoriesObject as WooFixedOption),
            {
              ...rowData,
              Images: urlImageList?.join(','),
            }
          )
        );
      }
      const progress = {
        percent: Math.floor((result.length / data.length) * 100),
        currentProcess: result.length,
      };

      socket.emit('woo-progress', {
        progress,
        socketId,
      });
    }
    const resultPublished = publishedTimeHelper(
      result,
      publicTime,
      gapFrom,
      gapTo
    );
    // create excel from result and send file to telegram id by bot
    const ws = XLSX.utils.json_to_sheet(resultPublished);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'result');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    const date = moment().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `${
      watermarkObject.shopName.split('.')[0]
    }-WOO-${date}.csv`;
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
    throw error;
  }
}
