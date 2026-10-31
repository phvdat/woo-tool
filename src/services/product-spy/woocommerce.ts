import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const WC_PAGE_SIZE = 100;
const WC_MAX_PAGES = 5;
const WC_REFRESH_LIMIT = WC_PAGE_SIZE * WC_MAX_PAGES;

export interface WooFetchOptions {
  isKnown?: (externalId: string) => boolean | Promise<boolean>;
}

export interface WooFetchResult {
  products: RawSpyProduct[];
  hasProducts: boolean;
}

interface WCProductPrices {
  price?: string;
  regular_price?: string;
  sale_price?: string;
  currency_minor_unit?: number;
}

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price?: string;
  prices?: WCProductPrices;
  images: { src: string }[];
}

function formatWooPrice(prices?: WCProductPrices): string | undefined {
  if (!prices) return undefined;
  const raw = prices.price ?? prices.sale_price ?? prices.regular_price;
  if (raw === undefined || raw === null || raw === "") return undefined;

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return String(raw);

  const minorUnit = Number(prices.currency_minor_unit ?? 2);
  const divider = Math.pow(10, Number.isFinite(minorUnit) ? minorUnit : 2);
  const value = amount / divider;
  return value.toFixed(Number.isFinite(minorUnit) ? minorUnit : 2);
}

export async function fetchWooCommerceProducts(
  baseUrl: string,
  options: WooFetchOptions = {}
): Promise<WooFetchResult> {
  const url = baseUrl.replace(/\/+$/, "");
  const apiUrl = `${url}/wp-json/wc/store/v1/products`;
  const isKnown = options.isKnown;

  const newProducts: RawSpyProduct[] = [];
  const knownProducts: RawSpyProduct[] = [];
  let hasProducts = false;

  for (let page = 1; page <= WC_MAX_PAGES; page++) {
    let batch: WCProduct[];

    try {
      const { data } = await axios.get<WCProduct[]>(apiUrl, {
        params: {
          orderby: "date",
          order: "desc",
          per_page: WC_PAGE_SIZE,
          page,
        },
        timeout: 15000,
        headers: { "User-Agent": UA },
      });
      batch = Array.isArray(data) ? data : [];
    } catch (err) {
      // A failed first page means the store could not be read at all, so the
      // caller still has to see the error and fall back to the generic crawler.
      if (page === 1) throw err;
      break;
    }

    if (batch.length === 0) break;

    hasProducts = true;

    for (const p of batch) {
      const externalId = String(p.id);
      const product: RawSpyProduct = {
        externalId,
        title: p.name || "",
        url: p.permalink || "",
        slug: p.slug || "",
        price: formatWooPrice(p.prices) || p.price || undefined,
        image: p.images?.[0]?.src || undefined,
        images: p.images?.map((img) => img.src) || [],
        source: "woocommerce",
      };

      if (isKnown && (await isKnown(externalId))) {
        if (knownProducts.length < WC_REFRESH_LIMIT) knownProducts.push(product);
      } else {
        newProducts.push(product);
      }
    }

    if (batch.length < WC_PAGE_SIZE) break;
  }

  return {
    products: [...knownProducts, ...newProducts],
    hasProducts,
  };
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
