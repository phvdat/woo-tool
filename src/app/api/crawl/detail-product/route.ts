import _get from 'lodash/get';
import puppeteer from 'puppeteer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') as string;
  const selectorProductName = searchParams.get('selectorProductName') as string;
  const selectorImageLinks = searchParams.get('selectorImageLinks') as string;

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const name =
      (await page.$eval(selectorProductName, (el) => el.innerHTML)) || '';
    const imgLinks = await page.$$eval(selectorImageLinks, (imgs) =>
      imgs.map((img: Element) => (img as HTMLImageElement).src)
    );

    await browser.close();

    return Response.json({
      Name: name.replaceAll('\n', ''),
      Images: imgLinks.join(','),
    });
  } catch (error) {
    console.log('Error in API call', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
