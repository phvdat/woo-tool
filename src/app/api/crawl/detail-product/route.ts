import _get from 'lodash/get';
import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import TelegramBot from 'node-telegram-bot-api';
import _toString from 'lodash/toString';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';

const bot = new TelegramBot(_toString(process.env.TELEGRAM_BOT_TOKEN), {
  polling: false,
});

export async function POST(request: Request) {
  const payload = await request.json();
  const {
    urls,
    selectorProductName,
    selectorImageLinks,
    maxImageQuality,
    telegramId,
  } = payload;

  const urlList = urls.split(',');
  const result = [];
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    for (const url of urlList) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(selectorProductName);
      const name = await page.$eval(selectorProductName, (el) => el.innerHTML);
      await page.waitForSelector(selectorImageLinks);
      const imgLinks = await page.$$eval(selectorImageLinks, (imgs) =>
        imgs.map((img: Element) => (img as HTMLImageElement).src)
      );
      console.log('name', name);
      console.log('imgLinks', imgLinks);

      result.push({
        Name: name.replaceAll('\n', '').trim(),
        Images: imgLinks.slice(0, maxImageQuality).join(','),
      });
    }

    await browser.close();
    // create excel from result and send file to telegram id by bot
    const ws = XLSX.utils.json_to_sheet(result);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'result');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    const date = moment().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `crawl-products-${date}.csv`;
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
    console.log('Error in API call', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
