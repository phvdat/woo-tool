import * as XLSX from 'xlsx';
import _get from 'lodash/get';
import { WooCategoryPayload } from '../categories-config/route';
import { WooWatermarkPayload } from '../watermark-config/route';
import { WooCommerce } from '@/types/woo';
import moment from 'moment';
import { sendMessage } from '@/services/send-message';
import { CreateWatermark } from '@/helper/watermark';
import { createWooRecord } from '@/helper/woo';
import TelegramBot from 'node-telegram-bot-api';
import _toString from 'lodash/toString';
import { createReadStream, unlink, unlinkSync, writeFileSync } from 'fs';
interface SheetData {
  Name: string;
  Images: string;
}

const bot = new TelegramBot(_toString(process.env.TELEGRAM_BOT_TOKEN), {
  polling: false,
});

export async function POST(request: Request) {
  const payload = await request.formData();

  const file = payload.get('file') as File;
  const apiKey = payload.get('apiKey') as string;
  const promptQuestion = payload.get('promptQuestion') as string;
  const categoriesObject = JSON.parse(
    _toString(payload.get('categoriesObject'))
  ) as WooCategoryPayload;
  const watermarkObject = JSON.parse(
    _toString(payload.get('watermarkObject'))
  ) as WooWatermarkPayload;
  const telegramId = payload.get('telegramId') as string;

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
    let publishedDate = moment().add(4, 'hours');
    for (const row of data) {
      const rowData = row as any;
      const keyWord: string = rowData['Name'];
      const imageUrls: string[] = rowData['Images'].split(',');
      const question = promptQuestion.replaceAll('{key}', keyWord);
      const responseChatGPTPromise = sendMessage(question, apiKey);
      const responseImagesPromise = CreateWatermark({
        ...watermarkObject,
        images: imageUrls,
        name: keyWord,
      });

      const [responseChatGPT, urlImageList] = await Promise.all([
        responseChatGPTPromise,
        responseImagesPromise,
      ]);

      const content = _get(
        responseChatGPT,
        'choices[0].message.content',
        ''
      ).replaceAll('*', '');

      const formattedPublishedDate = publishedDate.format(
        'YYYY-MM-DD HH:mm:ss'
      );
      result.push(
        createWooRecord(categoriesObject, {
          ...rowData,
          description: content,
          publishedDate: formattedPublishedDate,
          images: urlImageList.join(','),
          name: keyWord,
        })
      );
      publishedDate.add(5, 'minutes');
    }
    // create excel from result and send file to telegram id by bot
    const ws = XLSX.utils.json_to_sheet(result);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'result');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    const date = moment().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `woo-${date}.csv`;
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

    const errorChatGPT = _get(error, 'response.data.error.message', '');
    return Response.json({ message: errorChatGPT }, {
      status: 500,
    });
  }
}
