import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;
const PRODUCTS_PER_PAGE = 50;
const MAX_PRODUCTS = 200;

interface ShopBaseProduct {
  id: number;
  title: string;
  handle?: string;
  body_html?: string;
  images: { src: string }[];
  variants: { price: string }[];
  created_at: string;
  updated_at: string;
  url?: string;
}

interface ShopBaseProductsResponse {
  products?: ShopBaseProduct[];
  data?: ShopBaseProduct[];
}

const SHOPBASE_SIGNALS = [
  /shopbase\.com/i,
  /content\.shopbase\.com/i,
  /cdn\.thesitebase\.net/i,
  /thesitebase\.net/i,
  /sbsdk/i,
  /window\.sbsdk/i,
  /shopbase/i,
  /sb[-_]?store/i,
  /sb[-_]?config/i,
  /__shopbase/i,
  /ShopBaseApp/i,
];

export async function isShopBaseStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const baseUrl = url.replace(/\/+$/, "");
  let signalCount = 0;

  // 1. Try ShopBase API endpoints
  try {
    const { status, data } = await axios.get(
      `${baseUrl}/api/products`,
      {
        params: { limit: 1 },
        timeout: 8000,
        headers: { "User-Agent": UA },
      }
    );
    if (status === 200 && data && typeof data === "object") {
      if (Array.isArray(data.products) || Array.isArray(data.data)) {
        return { detected: true, reason: "ShopBase API confirmed" };
      }
    }
  } catch {
    // continue
  }

  // 2. Check homepage HTML for multiple ShopBase signals
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: 10000,
      headers: { "User-Agent": UA },
    });

    if (typeof html === "string") {
      const dom = new JSDOM(html);
      const { document } = dom.window;

      // Check meta tags
      const generator = document.querySelector('meta[name="generator"]');
      const genContent = generator?.getAttribute("content") || "";
      if (/shopbase/i.test(genContent)) {
        return { detected: true, reason: "ShopBase generator meta tag found" };
      }

      // Check for ShopBase script URLs
      const scripts = document.querySelectorAll('script[src]');
      for (const s of Array.from(scripts)) {
        const src = s.getAttribute("src") || "";
        if (/content\.shopbase\.com|cdn\.thesitebase\.net|shopbase\.com/i.test(src)) {
          return { detected: true, reason: "ShopBase CDN assets found" };
        }
      }

      // Check for ShopBase-specific JavaScript globals
      const scriptsInline = document.querySelectorAll('script:not([src])');
      for (const s of Array.from(scriptsInline)) {
        const text = s.textContent || "";
        if (/sbsdk|__shopbase|ShopBaseApp|window\.sbsdk/i.test(text)) {
          return { detected: true, reason: "ShopBase JavaScript globals detected" };
        }
      }

      // Check body class for ShopBase
      const body = document.querySelector("body");
      const bodyClass = body?.className || "";
      if (/sb-|shopbase/i.test(bodyClass)) {
        return { detected: true, reason: "ShopBase body class detected" };
      }

      // Count multiple signals for broader detection
      for (const signal of SHOPBASE_SIGNALS) {
        if (signal.test(html)) {
          signalCount++;
        }
      }

      if (signalCount >= 3) {
        return { detected: true, reason: `Multiple ShopBase signals detected (${signalCount})` };
      }
    }
  } catch {
    // homepage fetch failed
  }

  return { detected: false, reason: "No ShopBase signals detected" };
}

export async function fetchShopBaseProducts(
  url: string
): Promise<RawSpyProduct[]> {
  const base = url.replace(/\/+$/, "");
  const allProducts: RawSpyProduct[] = [];
  let page = 1;

  while (allProducts.length < MAX_PRODUCTS) {
    try {
      const { data, status } = await axios.get<ShopBaseProductsResponse>(
        `${base}/api/products`,
        {
          params: { limit: PRODUCTS_PER_PAGE, page },
          timeout: REQUEST_TIMEOUT,
          headers: { "User-Agent": UA },
        }
      );

      if (status !== 200) break;

      const products = data?.products || data?.data || [];
      if (products.length === 0) break;

      for (const p of products) {
        const price = p.variants?.[0]?.price || undefined;
        allProducts.push({
          externalId: String(p.id),
          title: p.title || "",
          url: p.url || `${base}/products/${p.handle || p.id}`,
          slug: p.handle || undefined,
          price,
          image: p.images?.[0]?.src || undefined,
          images: p.images?.map((img) => img.src) || [],
          dateCreated: p.created_at || undefined,
          source: "shopbase",
        });
      }

      if (products.length < PRODUCTS_PER_PAGE) break;
      page++;
    } catch {
      break;
    }
  }

  return allProducts;
}
