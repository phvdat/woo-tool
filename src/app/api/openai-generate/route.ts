import { CreateWatermark } from '@/helper/watermark';
import { createWooRecord } from '@/helper/woo';
import { sendMessage } from '@/services/send-message';
import { WooCommerce } from '@/types/woo';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
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

export async function POST(request: Request) {
  const payload = await request.formData();

  const file = payload.get('file') as File;
  const telegramId = payload.get('telegramId') as string;
  const promptQuestion = payload.get('promptQuestion') as string;
  const apiKey = payload.get('apiKey') as string;
  let publishedDate = moment().add(10, 'minutes');

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
      const keyWord: string = rowData['Name'];
      const question = promptQuestion.replaceAll('{product-name}', keyWord);
      const responseChatGPT = await sendMessage(question, apiKey);
      const Description = rowData['Description'];
      const finalDescription = Description.replace(
        '(content)',
        `<p>${responseChatGPT}</p>`
      );

      const formattedPublishedDate = publishedDate.format(
        'YYYY-MM-DD HH:mm:ss'
      );
      result.push({
        ...rowData,
        Description: finalDescription,
        'Published Date': formattedPublishedDate,
      });
      publishedDate.add(60 + Math.floor(Math.random() * 20), 'seconds');
    }
    // create excel from result and send file to telegram id by bot
    const ws = XLSX.utils.json_to_sheet(result);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'result');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    const date = moment().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `woo-openai-${date}.csv`;
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
