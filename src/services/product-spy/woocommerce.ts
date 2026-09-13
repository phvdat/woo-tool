import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  date_created: string;
  images: { src: string }[];
}

const WC_SIGNALS = [
  /woocommerce/i,
  /wc[-_]?store/i,
  /wc[-_]?settings/i,
  /wp-content\/plugins\/woocommerce/i,
];

export async function fetchWooCommerceProducts(
  baseUrl: string
): Promise<RawSpyProduct[]> {
  const url = baseUrl.replace(/\/+$/, "");
  const apiUrl = `${url}/wp-json/wc/store/v1/products`;

  const { data } = await axios.get<WCProduct[]>(apiUrl, {
    params: { orderby: "date", order: "desc", per_page: 20 },
    timeout: 15000,
    headers: { "User-Agent": UA },
  });

  return data.map((p) => ({
    externalId: String(p.id),
    title: p.name || "",
    url: p.permalink || "",
    slug: p.slug || "",
    price: p.price || undefined,
    image: p.images?.[0]?.src || undefined,
    images: p.images?.map((img) => img.src) || [],
    dateCreated: p.date_created || undefined,
    source: "woocommerce",
  }));
}

export async function isWooCommerceStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const baseUrl = url.replace(/\/+$/, "");

  // 1. Try Store API with per_page=1
  try {
    const { status, data } = await axios.get(
      `${baseUrl}/wp-json/wc/store/v1/products`,
      {
        params: { per_page: 1 },
        timeout: 8000,
        headers: { "User-Agent": UA },
      }
    );
    if (status === 200 && Array.isArray(data)) {
      return { detected: true, reason: "WooCommerce Store API responded with products" };
    }
  } catch {
    // continue to next check
  }

  // 2. Try Store API endpoint exists but may return non-200
  try {
    const { status } = await axios.get(
      `${baseUrl}/wp-json/wc/store/v1/products`,
      {
        params: { per_page: 1 },
        timeout: 8000,
        headers: { "User-Agent": UA },
        validateStatus: () => true,
      }
    );
    if (status >= 200 && status < 500) {
      return { detected: true, reason: "WooCommerce Store API endpoint exists" };
    }
  } catch {
    // continue
  }

  // 3. Check homepage HTML for WooCommerce signals
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: 10000,
      headers: { "User-Agent": UA },
    });

    const dom = new JSDOM(html);
    const { document } = dom.window;
    const htmlStr = html as string;

    // Check meta tags
    const generator = document.querySelector('meta[name="generator"]');
    if (generator?.getAttribute("content")?.match(/woocommerce/i)) {
      return { detected: true, reason: "WordPress generator meta tag mentions WooCommerce" };
    }

    // Check for WooCommerce scripts/styles/links in HTML
    for (const signal of WC_SIGNALS) {
      if (signal.test(htmlStr)) {
        return { detected: true, reason: `WooCommerce signal found in page HTML` };
      }
    }

    // Check body class for woocommerce
    const body = document.querySelector("body");
    if (body?.className?.match(/woocommerce/i)) {
      return { detected: true, reason: "Body class contains WooCommerce" };
    }
  } catch {
    // homepage fetch failed
  }

  return { detected: false, reason: "No WooCommerce signals detected" };
}
