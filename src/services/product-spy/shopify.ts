import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;
const PRODUCTS_PER_PAGE = 50;
const MAX_PRODUCTS = 200;

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  images: { src: string }[];
  variants: { price: string }[];
  created_at: string;
  updated_at: string;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export async function isShopifyStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const base = url.replace(/\/+$/, "");

  // 1. Try /products.json
  try {
    const { status, data } = await axios.get(`${base}/products.json`, {
      params: { limit: 1 },
      timeout: 8000,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
    });
    if (status === 200 && data && typeof data === "object") {
      if (Array.isArray(data.products)) {
        return { detected: true, reason: "Shopify /products.json returned products" };
      }
      return { detected: true, reason: "Shopify /products.json endpoint exists" };
    }
  } catch {
    // continue
  }

  // 2. Try /collections/all (Shopify collection page)
  try {
    const { status, data: html } = await axios.get(`${base}/collections/all`, {
      timeout: 8000,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
    });
    if (status === 200 && typeof html === "string") {
      if (/cdn\.shopify\.com|shopify-render/i.test(html)) {
        return { detected: true, reason: "Shopify collection page with Shopify CDN assets" };
      }
    }
  } catch {
    // continue
  }

  // 3. Check homepage for Shopify signals
  try {
    const { data: html } = await axios.get(base, {
      timeout: 10000,
      headers: { "User-Agent": UA },
    });
    if (typeof html === "string") {
      if (/cdn\.shopify\.com/i.test(html)) {
        return { detected: true, reason: "Shopify CDN assets found on homepage" };
      }
      const dom = new JSDOM(html);
      const { document } = dom.window;
      const generator = document.querySelector('meta[name="generator"]');
      if (generator?.getAttribute("content")?.match(/shopify/i)) {
        return { detected: true, reason: "Shopify generator meta tag found" };
      }
      const scripts = document.querySelectorAll('script[src]');
      for (const s of Array.from(scripts)) {
        const src = s.getAttribute("src") || "";
        if (/shopify|cdn\.shopify/i.test(src)) {
          return { detected: true, reason: "Shopify script found on homepage" };
        }
      }
    }
  } catch {
    // homepage fetch failed
  }

  return { detected: false, reason: "No Shopify signals detected" };
}

export async function fetchShopifyProducts(
  url: string
): Promise<RawSpyProduct[]> {
  const base = url.replace(/\/+$/, "");
  const allProducts: RawSpyProduct[] = [];
  let page = 1;

  while (allProducts.length < MAX_PRODUCTS) {
    try {
      const { data, status } = await axios.get<ShopifyProductsResponse>(
        `${base}/products.json`,
        {
          params: { limit: PRODUCTS_PER_PAGE, page },
          timeout: REQUEST_TIMEOUT,
          headers: { "User-Agent": UA },
        }
      );

      if (status !== 200 || !data?.products || data.products.length === 0) {
        break;
      }

      for (const p of data.products) {
        const price = p.variants?.[0]?.price || undefined;
        allProducts.push({
          externalId: String(p.id),
          title: p.title || "",
          url: `${base}/products/${p.handle}`,
          slug: p.handle || undefined,
          price,
          image: p.images?.[0]?.src || undefined,
          images: p.images?.map((img) => img.src) || [],
          dateCreated: p.created_at || undefined,
          source: "shopify",
        });
      }

      if (data.products.length < PRODUCTS_PER_PAGE) {
        break;
      }
      page++;
    } catch {
      break;
    }
  }

  return allProducts;
}
