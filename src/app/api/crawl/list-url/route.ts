import axios from 'axios';
import _get from 'lodash/get';
import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') as string;
  const productLinksSelector = searchParams.get(
    'productLinksSelector'
  ) as string;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(), // Ensure the correct path to Chromium/Chrome
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(productLinksSelector);

    const productLinks = await page.$$eval(productLinksSelector, (links) =>
      links.map((link) => (link as HTMLLinkElement).href)
    );

    await browser.close();

    return new Response(JSON.stringify(productLinks), { status: 200 });
  } catch (error) {
    await browser.close();
    console.log('Error fetching data', error);
    return new Response(JSON.stringify(error), {
      status: _get(error, 'response.status', 500),
    });
  } finally {
    await browser.close();
  }
}
