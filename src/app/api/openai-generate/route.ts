import { getSocket } from '@/config/socket';
import { publishedTimeHelper } from '@/helper/common';
import chatgpt from '@/services/chatgpt';
import deepSeek from '@/services/deepseek';
import { WooCommerce } from '@/types/woo';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { shuffle } from 'lodash';
import _get from 'lodash/get';
import _toString from 'lodash/toString';
import moment from 'moment';
import TelegramBot from 'node-telegram-bot-api';
import * as XLSX from 'xlsx';
interface SheetData {
  Name: string;
  Images: string;
}

const bot = new TelegramBot(_toString(process.env.TELEGRAM_BOT_TOKEN), {
  polling: false,
});

const socket = getSocket();
socket.connect();

export async function POST(request: Request) {
  const payload = await request.formData();

  const file = payload.get('file') as File;
  const telegramId = payload.get('telegramId') as string;
  const promptQuestion = payload.get('promptQuestion') as string;
  const website = payload.get('website') as string;
  const apiKey = payload.get('apiKey') as string;
  const mixed = payload.get('mixed') as string;
  const publicTime = Number(payload.get('publicTime'));
  const gapFrom = Number(payload.get('gapFrom'));
  const gapTo = Number(payload.get('gapTo'));
  const socketId = Number(payload.get('socketId'));

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(wordSheet) as SheetData[];
    if (!data[0].hasOwnProperty('Name')) {
      return Response.json({ message: 'Invalid excel file' }, { status: 400 });
    }
    const result: WooCommerce[] = [];
    for (const row of data) {
      const rowData = row as any;
      const productName: string = rowData['Name'];
      const categoryRaw = rowData['Categories'];
      const category = categoryRaw.split('>').pop().trim();
      const question = promptQuestion
        .replaceAll('{product-name}', productName)
        .replaceAll('{category}', category)
        .replaceAll('{website}', website);
      console.log(question);

      // const responseChatGPT = await deepSeek(question, apiKey);
      const responseChatGPT = await chatgpt(question, apiKey);
      const Description = rowData['Description'];
      const finalDescription = Description.replace(
        '(content)',
        `<p>${responseChatGPT}</p>`
      );

      result.push({
        ...rowData,
        Description: finalDescription,
      });
      const progress = Math.floor((result.length / data.length) * 100);
      socket.emit('openai-progress', { progress, socketId });
    }
    let resultMixed = result;

    if (mixed === 'true') {
      resultMixed = shuffle(resultMixed);
    }

    const resultPublished = publishedTimeHelper(
      resultMixed,
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
    const fileName = `${website}-AI-${date}.csv`;
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
    console.log('error api openai', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
