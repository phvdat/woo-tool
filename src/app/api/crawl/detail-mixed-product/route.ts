import _get from 'lodash/get';
import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { telegramBot } from '@/services/telegram';
import { SelectorFormValues } from '@/components/crawl-tool/SelectorSetup';
import { getSocket } from '@/config/socket';

const bot = telegramBot;

const socket = getSocket();
socket.connect();

function formatName(rawName: string): string {
  if (!rawName) return '';

  let name = rawName;
  // 1. Xóa \n, khoảng trắng, ., -, _ ở đầu/cuối
  name = name.replace(/^[.\-_,* \s\n]+|[.\-_* \s\n]+$/g, '');
  // 2. Xóa SKU dạng in hoa + số >=4 ký tự ở cuối (VD: " - LADJFHDSKJ432")
  name = name.replace(/\s*[-–—]?\s*[A-Z0-9]{4,}\s*$/g, '');
  name = name.replace(/\s+/g, ' ');
  return name.trim();
}

function formatImages(imgLinks: string[]): string[] {
  const unique = Array.from(
    new Set(imgLinks.map((link) => link.trim()).filter((link) => link !== ''))
  );
  return unique;
}

const getDomain = (url: string) => {
  const domain = new URL(url).hostname;
  return domain.startsWith('www.') ? domain.slice(4) : domain;
};

export async function POST(request: Request) {
  const payload = await request.json();
  const { urls, selectors, telegramId, socketId } = payload;
  const urlList = urls.split('\n').filter((u: string) => u.trim() !== '');
  const result: any[] = [];

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    for (const url of urlList) {
      try {
        const domain = getDomain(url);
        const selector: SelectorFormValues | undefined = selectors.find(
          (s: SelectorFormValues) => s.domain === domain
        );

        if (!selector) {
          console.warn(`No selector found for domain: ${domain}`);
          result.push({ error: url });
          continue;
        }

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector(selector.nameSelector, { timeout: 20000 });
        const name = await page.$eval(
          selector.nameSelector,
          (el) => el.innerHTML
        );

        await page.waitForSelector(selector.imagesSelector, { timeout: 20000 });
        const imgLinks = await page.$$eval(selector.imagesSelector, (imgs) =>
          imgs.map(
            (img: Element) =>
              (img as HTMLImageElement)?.src ||
              (img as HTMLLinkElement)?.href ||
              ''
          )
        );
        console.log({
          Name: formatName(name),
          Images: formatImages(imgLinks).join(','),
        });
        result.push({
          Name: formatName(name),
          Images: formatImages(imgLinks).join(','),
          Link: url,
        });
        const progress = {
          percent: Math.floor((result.length / urlList.length) * 100),
          currentProcess: result.length,
        };
        socket.emit('crawl-progress', {
          progress,
          socketId,
        });
      } catch (err) {
        console.error(`❌ Error while crawling ${url}:`, err);
        result.push({ error: url });
        socket.emit('crawl-error', { err, socketId });
        continue;
      }
    }

    if (!telegramId) {
      await browser.close();
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

    await browser.close();
    return Response.json(result, { status: 200 });
  } catch (error) {
    await browser.close();
    console.error('Error in API call', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
