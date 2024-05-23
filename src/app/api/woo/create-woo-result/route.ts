import * as XLSX from 'xlsx';
import _get from 'lodash/get';
import { WooCategoryPayload } from "../categories-config/route";
import { WooWatermarkPayload } from "../watermark-config/route";
import { WooCommerce } from '@/types/woo';
import moment from 'moment';
import { sendMessage } from '@/services/send-message';
import { CreateWatermark } from '@/helper/watermark';
import { createWooRecord } from '@/helper/woo';
import TelegramBot from 'node-telegram-bot-api';
import _toString from 'lodash/toString';

const bot = new TelegramBot(_toString(process.env.TELEGRAM_BOT_TOKEN), { polling: false });

export async function POST(request: Request) {
  const payload = await request.formData();
  const file = payload.get('file') as File;
  const apiKey = payload.get('apiKey') as string;
  const promptQuestion = payload.get('promptQuestion') as string;
  const categoriesObject = JSON.parse(_toString(payload.get('categoriesObject'))) as WooCategoryPayload;
  const watermarkObject = JSON.parse(_toString(payload.get('watermarkObject'))) as WooWatermarkPayload;
  const telegramId = payload.get('telegramId') as string;

  try {
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = async (e) => {
      const bufferArray = e.target?.result;
      const wb = XLSX.read(bufferArray, {
        type: 'buffer',
      });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
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
          })
        );
        publishedDate.add(5, 'minutes');
      }
      // convert to excel and send to telegram
      const date = moment().format('YYYY-MM-DD-HH-mm-ss');
      const wbResult = XLSX.utils.book_new();
      const wsResult = XLSX.utils.json_to_sheet(result);
      XLSX.utils.book_append_sheet(wbResult, wsResult, 'Sheet 1');
      const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const stream = Buffer.from(await blob.arrayBuffer());
      bot.sendDocument(telegramId, stream, {
        caption: `Images for ${watermarkObject.shopName}`,
      })
      return Response.json(result, { status: 200 });
    };
    fileReader.onerror = (error) => {
      return Response.json('Error reading file', { status: 500 });
    };
  }
  catch (error) {
    return Response.json('Error processing file', { status: 500 });
  }
}