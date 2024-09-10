import axios from 'axios';
import _get from 'lodash/get';
import { JSDOM } from 'jsdom';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') as string;
  const productLinksSelector = searchParams.get(
    'productLinksSelector'
  ) as string;

  try {
    const response = await axios.get(url);
    const htmlContent = response.data;

    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const links = Array.from(document.querySelectorAll(productLinksSelector));
    const productLinks = links.map((link) => (link as HTMLAnchorElement).href);

    return new Response(JSON.stringify(productLinks), { status: 200 });
  } catch (error) {
    console.log('Error fetching data', error);
    return new Response(JSON.stringify(error), {
      status: _get(error, 'response.status', 500),
    });
  }
}
