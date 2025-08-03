import _get from 'lodash/get';
import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import _toString from 'lodash/toString';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { telegramBot } from '@/services/telegram';
import { SelectorFormValues } from '@/components/crawl-tool/SelectorSetup';

const bot = telegramBot;

const getDomain = (url: string) => {
  const domain = new URL(url).hostname;
  return domain.startsWith('www.') ? domain.slice(4) : domain;
};

export async function POST(request: Request) {
  const payload = await request.json();
  const { urls, selectors, telegramId } = payload;
  const urlList = urls.split('\n');
  const result = [];
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    for (const url of urlList) {
      const domain = getDomain(url);
      const selector: SelectorFormValues = selectors.find(
        (s: SelectorFormValues) => s.domain === domain
      );
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(selector.nameSelector);
      const name = await page.$eval(
        selector.nameSelector,
        (el) => el.innerHTML
      );
      await page.waitForSelector(selector.imagesSelector);
      const imgLinks = await page.$$eval(selector.imagesSelector, (imgs) =>
        imgs.map(
          (img: Element) =>
            (img as HTMLImageElement)?.src || (img as HTMLLinkElement)?.href
        )
      );
      console.log('name', name);
      console.log('imgLinks', imgLinks);

      result.push({
        Name: name.replaceAll('\n', '').trim(),
        Images: imgLinks.join(','),
      });
    }

    await browser.close();
    if (!telegramId) {
      return Response.json(result, { status: 200 });
    }
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
    await browser.close();
    console.log('Error in API call', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  } finally {
    await browser.close();
  }
}
