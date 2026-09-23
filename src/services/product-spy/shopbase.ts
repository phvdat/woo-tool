import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;
const DETECTION_TIMEOUT = 10000;
const MAX_PRODUCTS = 200;
const MAX_SITEMAPS = 20;

interface JsonLdOffer {
  "@type"?: string;
  url?: string;
  price?: string | number;
  lowPrice?: string | number;
  highPrice?: string | number;
  priceCurrency?: string;
}

interface JsonLdProduct {
  "@type"?: string | string[];
  productID?: string;
  sku?: string;
  name?: string;
  url?: string;
  image?: string | string[];
  offers?: JsonLdOffer | JsonLdOffer[];
}

const SHOPBASE_STRONG_SIGNALS = [
  /content\.shopbase\.com/i,
  /cdn\.thesitebase\.net/i,
  /img\.thesitebase\.net/i,
  /thesitebase\.net/i,
  /window\.sbsdk/i,
  /__shopbase/i,
  /ShopBaseApp/i,
];

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function extractSlug(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);

    return parts.at(-1);
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  return typeof data === "string" ? data : "";
}

/**
 * Recursively find a Schema.org Product.
 *
 * Supports:
 * - direct Product object
 * - array of JSON-LD objects
 * - @graph
 * - nested JSON-LD structures
 */
function findJsonLdProduct(value: unknown): JsonLdProduct | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const product = findJsonLdProduct(item);

      if (product) {
        return product;
      }
    }

    return null;
  }

  const object = value as Record<string, unknown>;

  const type = object["@type"];

  const types = Array.isArray(type)
    ? type.map(String)
    : type
      ? [String(type)]
      : [];

  if (
    types.some(
      (value) => value.toLowerCase() === "product"
    )
  ) {
    return object as JsonLdProduct;
  }

  for (const child of Object.values(object)) {
    const product = findJsonLdProduct(child);

    if (product) {
      return product;
    }
  }

  return null;
}

/**
 * Extract Product from JSON-LD.
 */
function parseJsonLdProduct(
  html: string,
  productUrl: string
): RawSpyProduct | null {
  const dom = new JSDOM(html);

  const scripts = dom.window.document.querySelectorAll(
    'script[type="application/ld+json"]'
  );

  for (const script of Array.from(scripts)) {
    const content = script.textContent?.trim();

    if (!content) {
      continue;
    }

    try {
      const parsed = JSON.parse(content);

      const product = findJsonLdProduct(parsed);

      if (!product) {
        continue;
      }

      const offer = Array.isArray(product.offers)
        ? product.offers[0]
        : product.offers;

      const images = Array.isArray(product.image)
        ? product.image
        : product.image
          ? [product.image]
          : [];

      const price =
        offer?.price ??
        offer?.lowPrice ??
        offer?.highPrice;

      const productUrlFromData =
        product.url ||
        offer?.url ||
        productUrl;

      return {
        externalId:
          product.sku ||
          product.productID ||
          productUrl,

        title: product.name || "",

        url: productUrlFromData,

        slug: extractSlug(productUrlFromData),

        price:
          price !== undefined
            ? String(price)
            : undefined,

        image: images[0],

        images,

        source: "shopbase",
      };
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  }

  return null;
}

/**
 * Fallback when JSON-LD exists but Product data is incomplete.
 */
function parseMetaProduct(
  html: string,
  productUrl: string
): RawSpyProduct | null {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const title =
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content")
      ?.trim() ||
    document.querySelector("title")?.textContent?.trim() ||
    "";

  const image =
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content") ||
    undefined;

  const price =
    document
      .querySelector('meta[property="product:price:amount"]')
      ?.getAttribute("content") ||
    undefined;

  if (!title) {
    return null;
  }

  return {
    externalId: productUrl,
    title,
    url: productUrl,
    slug: extractSlug(productUrl),
    price,
    image,
    images: image ? [image] : [],
    source: "shopbase",
  };
}

/**
 * Fetch a sitemap and return URLs.
 */
async function fetchSitemapUrls(
  sitemapUrl: string
): Promise<string[]> {
  try {
    const xml = await fetchHtml(sitemapUrl);

    if (!xml) {
      return [];
    }

    return Array.from(
      xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi),
      (match) => match[1].trim()
    );
  } catch {
    return [];
  }
}

/**
 * Discover product URLs from sitemap.xml.
 *
 * Supports:
 * - normal sitemap
 * - sitemap index
 * - nested sitemaps
 */
async function getSitemapProductUrls(
  base: string
): Promise<string[]> {
  const sitemapCandidates = [
    `${base}/sitemap.xml`,
    `${base}/sitemap_index.xml`,
  ];

  const visitedSitemaps = new Set<string>();
  const productUrls = new Set<string>();
  const sitemapQueue = [...sitemapCandidates];

  while (
    sitemapQueue.length > 0 &&
    visitedSitemaps.size < MAX_SITEMAPS
  ) {
    const sitemapUrl = sitemapQueue.shift();

    if (!sitemapUrl) {
      continue;
    }

    if (visitedSitemaps.has(sitemapUrl)) {
      continue;
    }

    visitedSitemaps.add(sitemapUrl);

    const urls = await fetchSitemapUrls(sitemapUrl);

    for (const url of urls) {
      if (!url) {
        continue;
      }

      // Nested sitemap
      if (/sitemap/i.test(url)) {
        if (
          !visitedSitemaps.has(url) &&
          visitedSitemaps.size < MAX_SITEMAPS
        ) {
          sitemapQueue.push(url);
        }

        continue;
      }

      try {
        const pathname = new URL(url).pathname;

        if (
          /\/products?\//i.test(pathname) ||
          /\/product\//i.test(pathname)
        ) {
          productUrls.add(url);
        }
      } catch {
        // Ignore invalid URLs.
      }

      if (productUrls.size >= MAX_PRODUCTS) {
        break;
      }
    }
  }

  return Array.from(productUrls).slice(0, MAX_PRODUCTS);
}

/**
 * Detect whether a website is running ShopBase.
 */
export async function isShopBaseStore(
  url: string
): Promise<{
  detected: boolean;
  reason: string;
}> {
  const baseUrl = normalizeBaseUrl(url);

  try {
    const html = await axios.get<string>(baseUrl, {
      timeout: DETECTION_TIMEOUT,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (typeof html.data !== "string") {
      return {
        detected: false,
        reason: "Homepage did not return HTML",
      };
    }

    const page = html.data;

    const matchedSignals =
      SHOPBASE_STRONG_SIGNALS.filter((regex) =>
        regex.test(page)
      );

    if (matchedSignals.length > 0) {
      return {
        detected: true,
        reason: `ShopBase signal detected (${matchedSignals.length})`,
      };
    }

    // Check generator meta.
    const dom = new JSDOM(page);
    const document = dom.window.document;

    const generator =
      document
        .querySelector('meta[name="generator"]')
        ?.getAttribute("content") || "";

    if (/shopbase/i.test(generator)) {
      return {
        detected: true,
        reason: "ShopBase generator meta tag found",
      };
    }

    // Check script src.
    const scripts =
      document.querySelectorAll("script[src]");

    for (const script of Array.from(scripts)) {
      const src =
        script.getAttribute("src") || "";

      if (
        /content\.shopbase\.com/i.test(src) ||
        /thesitebase\.net/i.test(src) ||
        /shopbase/i.test(src)
      ) {
        return {
          detected: true,
          reason: "ShopBase CDN/script detected",
        };
      }
    }

    return {
      detected: false,
      reason: "No ShopBase signals detected",
    };
  } catch (error) {
    return {
      detected: false,
      reason:
        error instanceof Error
          ? `Detection failed: ${error.message}`
          : "Detection failed",
    };
  }
}

/**
 * Fetch products from a ShopBase store.
 *
 * Flow:
 * sitemap
 *   -> product URLs
 *   -> product HTML
 *   -> JSON-LD
 *   -> meta fallback
 */
export async function fetchShopBaseProducts(
  url: string
): Promise<RawSpyProduct[]> {
  const base = normalizeBaseUrl(url);


  const productUrls =
    await getSitemapProductUrls(base);

  if (productUrls.length === 0) {
    return [];
  }

  const products: RawSpyProduct[] = [];

  for (const productUrl of productUrls) {
    try {
      const html = await fetchHtml(productUrl);

      if (!html) {
        continue;
      }

      const dom = new JSDOM(html);

      const jsonLdCount =
        dom.window.document.querySelectorAll(
          'script[type="application/ld+json"]'
        ).length;

      let product =
        parseJsonLdProduct(
          html,
          productUrl
        );

      if (product?.title) {
        products.push(product);
        if (products.length >= MAX_PRODUCTS) {
          break;
        }

        continue;
      }

      // JSON-LD failed/incomplete -> meta fallback.
      product =
        parseMetaProduct(
          html,
          productUrl
        );

      if (product?.title) {
        products.push(product);

        if (products.length >= MAX_PRODUCTS) {
          break;
        }

        continue;
      }

    } catch (error) {
      console.log(
        `[ShopBase] Failed: ${productUrl}`,
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  return products;
}