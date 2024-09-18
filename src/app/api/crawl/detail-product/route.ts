import axios from 'axios';
import _get from 'lodash/get';
import { JSDOM } from 'jsdom';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') as string;
  const selectorProductName = searchParams.get('selectorProductName') as string;
  const selectorImageLinks = searchParams.get('selectorImageLinks') as string;
  try {
    const response = await axios.get(url);
    const htmlContent = response.data;

    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const name = document.querySelector(selectorProductName)?.innerHTML || '';
    const imgs = Array.from(document.querySelectorAll(selectorImageLinks));
    const imgLinks = imgs.map((img) => (img as any).src);
    return Response.json({
      Name: name.replaceAll('\n', ''),
      Images: imgLinks.join(','),
    });
  } catch (error) {
    console.log('error api openai', error);
    return Response.json(error, {
      status: _get(error, 'response.status', 500),
    });
  }
}
