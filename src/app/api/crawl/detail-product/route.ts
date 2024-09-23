import _get from 'lodash/get';
import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urls = searchParams.get('urls') as string;
  const selectorProductName = searchParams.get('selectorProductName') as string;
  const selectorImageLinks = searchParams.get('selectorImageLinks') as string;
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
      const name = await page.$eval(selectorProductName, (el) => el.innerHTML);
      const imgLinks = await page.$$eval(selectorImageLinks, (imgs) =>
        imgs.map((img: Element) => (img as HTMLImageElement).src)
      );
      console.log('name', name);
      console.log('imgLinks', imgLinks);

      result.push({
        Name: name.replaceAll('\n', ''),
        Images: imgLinks.join(','),
      });
    }

    await browser.close();

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.log('Error in API call', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
