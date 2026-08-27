import _get from 'lodash/get';
import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { telegramBot } from '@/services/telegram/telegram';
import { SelectorFormValues } from '@/components/crawl-tool/SelectorSetup';
import { getSocket } from '@/config/socket';
import { upscaleImage } from '@/helper/common';

const bot = telegramBot;

const socket = getSocket();
socket.connect();

function formatName(rawName: string): string {
  if (!rawName) return '';
  let name = rawName;
  name = name.replace(/^[.\u2026\s]+|[.\u2026\s]+$/g, '');
  name = name.replace(/^[\-_,* \s\n]+|[\-_* \s\n]+$/g, '');
  name = name.replace(/\s*[-–—]?\s*[A-Z0-9]{4,}\s*$/g, '');
  name = name.replace(/–/g, '-');
  name = name.replace(/\s+/g, ' ');
  name = name.replace('amp;', '');
  return name.trim();
}
function formatImages(imgLinks: string[]): string[] {
  const processedLinks = imgLinks.map((link) => {
    const trimmedLink = link.trim();
    if (trimmedLink === '') return '';
    try {
      const url = new URL(trimmedLink);
      return url.origin + url.pathname;
    } catch (e) {
      return trimmedLink;
    }
  });

  const unique = Array.from(
    new Set(processedLinks.filter((link) => link !== ''))
  );
  return unique;
}

const getDomain = (url: string) => {
  const parts = new URL(url).hostname.split('.');
  return parts.slice(-2).join('.');
};

export async function POST(request: Request) {
  const payload = await request.json();
  const { urls, selectors, telegramId, socketId } = payload;
  const urlList = urls.split('\n').filter((u: string) => u.trim() !== '');
  const result: any[] = [];

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1200,
    });
    for (const url of urlList) {
      try {
        const domain = getDomain(url);
        const selector: SelectorFormValues | undefined = selectors.find(
          (s: SelectorFormValues) => s.domain.includes(domain)
        );

        if (!selector) {
          console.warn(`No selector found for domain: ${domain}`);
          result.push({ error: url });
          continue;
        }

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector(selector.nameSelector, { timeout: 5000 });
        const name = await page.$eval(
          selector.nameSelector,
          (el) => el.innerHTML
        );

        await page.waitForSelector(selector.imagesSelector, { timeout: 5000 });
        const imgLinks = await page.$$eval(selector.imagesSelector, (imgs) =>
          imgs
            .map((img) => {
              const el = img as HTMLImageElement;
              if ((el as HTMLImageElement).src && !el.src.startsWith("data:image"))
                return el.src;
              if ((el as unknown as HTMLAnchorElement).href) return (el as unknown as HTMLAnchorElement).href;
              const attrs = [
                "data-large_image",
                "data-src",
                "data-lazy-src",
                "data-original",
              ];

              for (const a of attrs) {
                const val = el.getAttribute(a);
                if (val && !val.startsWith("data:image")) return val;
              }

              const srcset = el.getAttribute("srcset");
              if (srcset) return srcset.split(",")[0].split(" ")[0];

              return "";
            })
            .filter(Boolean)
        );
        result.push({
          Name: formatName(name),
          ImagesOrigin: formatImages(imgLinks).join(','),
          Images: Array.from(
            new Set(
              formatImages(imgLinks).map(upscaleImage)
            )
          ).join(','),
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
      } catch (error) {
        console.error(`❌ Error while crawling ${url}:`, error);
        result.push({ error: url });
        socket.emit('crawl-error', {
          error: {
            name: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : String(error),
            url: url,
          }, socketId
        });
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
