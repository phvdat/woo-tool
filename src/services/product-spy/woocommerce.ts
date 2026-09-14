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

  // 1. Try Store API — only accept 200 with array response
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
      return { detected: true, reason: "WooCommerce Store API responded successfully" };
    }
  } catch {
    // continue to next check
  }

  // 2. Check homepage HTML for strong WooCommerce signals only
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: 10000,
      headers: { "User-Agent": UA },
    });

    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Strong signal: generator meta tag explicitly mentions WooCommerce
    const generator = document.querySelector('meta[name="generator"]');
    const genContent = generator?.getAttribute("content") || "";
    if (/woocommerce/i.test(genContent)) {
      return { detected: true, reason: "WordPress generator meta tag mentions WooCommerce" };
    }

    // Strong signal: WooCommerce plugin path in asset URLs
    if (/wp-content\/plugins\/woocommerce\//.test(html as string)) {
      return { detected: true, reason: "WooCommerce plugin assets found in page HTML" };
    }

    // Strong signal: WooCommerce body class (e.g. "woocommerce" or "woocommerce-page")
    const body = document.querySelector("body");
    const bodyClass = body?.className || "";
    if (/\bwoocommerce\b/.test(bodyClass)) {
      return { detected: true, reason: "Body class contains WooCommerce" };
    }
  } catch {
    // homepage fetch failed
  }

  return { detected: false, reason: "WooCommerce Store API unavailable" };
}
