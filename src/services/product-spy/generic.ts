import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const USER_AGENT = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;
const MAX_CANDIDATES = 30;

function normalizeUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function parseSitemapsFromRobotsTxt(robotsText: string): string[] {
  const sitemaps: string[] = [];
  const lines = robotsText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip Cloudflare Managed Content Signals and empty/comment lines
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^Content-Signal:/i.test(trimmed)) continue;
    const match = trimmed.match(/^Sitemap:\s*(\S+)/i);
    if (match) {
      sitemaps.push(match[1]);
    }
  }
  return sitemaps;
}

async function discoverSitemapUrls(baseUrl: string): Promise<string[]> {
  const sitemapUrls: string[] = [];
  const base = baseUrl.replace(/\/+$/, "");

  // 1. Try robots.txt
  try {
    const { data: robots } = await axios.get(`${base}/robots.txt`, {
      timeout: 5000,
      headers: { "User-Agent": USER_AGENT },
    });
    const found = parseSitemapsFromRobotsTxt(robots);
    sitemapUrls.push(...found);
  } catch {
    // no robots.txt
  }

  // 2. Try common sitemap locations if robots.txt gave nothing
  if (sitemapUrls.length === 0) {
    const candidates = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];
    for (const path of candidates) {
      sitemapUrls.push(`${base}${path}`);
    }
  }

  return sitemapUrls;
}

async function fetchProductUrlsFromSitemaps(
  sitemapUrls: string[]
): Promise<string[]> {
  const productUrls: string[] = [];

  for (const sitemapUrl of sitemapUrls.slice(0, 5)) {
    try {
      const { data, status } = await axios.get(sitemapUrl, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": USER_AGENT },
        responseType: "text",
        validateStatus: () => true,
      });
      if (status !== 200) continue;

      const locMatches = data.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
      for (const match of locMatches) {
        const loc = match[1].trim();
        if (/product|shop|item/i.test(loc)) {
          productUrls.push(loc);
        }
      }
    } catch {
      continue;
    }
  }

  return Array.from(new Set(productUrls)).slice(0, MAX_CANDIDATES);
}

async function discoverProductUrlsFromHomepage(
  baseUrl: string
): Promise<string[]> {
  const base = baseUrl.replace(/\/+$/, "");
  const urls: string[] = [];

  try {
    const { data: html } = await axios.get(base, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": USER_AGENT },
    });

    const dom = new JSDOM(html);
    const { document } = dom.window;
    const links = document.querySelectorAll("a[href]");

    for (let i = 0; i < links.length && urls.length < MAX_CANDIDATES; i++) {
      const href = links[i].getAttribute("href");
      if (!href) continue;
      const full = normalizeUrl(href, base);
      if (!full) continue;
      if (/product|shop|item/i.test(full)) {
        urls.push(full);
      }
    }
  } catch {
    // homepage fetch failed
  }

  return Array.from(new Set(urls)).slice(0, MAX_CANDIDATES);
}

function extractProductFromJsonLd(
  doc: Document,
  pageUrl: string
): Partial<RawSpyProduct> | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = scripts[i].textContent;
      if (!raw) continue;
      const json = JSON.parse(raw);
      const products =
        json["@type"] === "Product"
          ? [json]
          : json["@graph"]?.filter((g: any) => g["@type"] === "Product") || [];
      for (const p of products) {
        if (p["@type"] !== "Product") continue;
        const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        return {
          title: p.name || "",
          url: p.url || pageUrl,
          image: Array.isArray(p.image) ? p.image[0] : p.image || undefined,
          price: offers?.price || offers?.lowPrice || undefined,
          slug: p.sku || undefined,
          externalId: p.sku || undefined,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractProductFromHtml(
  doc: Document,
  pageUrl: string
): Partial<RawSpyProduct> {
  const metaOgTitle = doc.querySelector('meta[property="og:title"]');
  const title =
    metaOgTitle?.getAttribute("content") ||
    doc.querySelector("title")?.textContent?.trim() ||
    "";

  const metaOgImage = doc.querySelector('meta[property="og:image"]');
  const imageSrc = doc.querySelector('link[rel="image_src"]');
  const image =
    metaOgImage?.getAttribute("content") ||
    imageSrc?.getAttribute("href") ||
    undefined;

  const canonical = doc.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonical?.getAttribute("href") || pageUrl;

  const priceEl = doc.querySelector('[itemprop="price"]');
  const wooPrice = doc.querySelector(".price .woocommerce-Price-amount");
  const genericPrice = doc.querySelector(".price");
  const price =
    priceEl?.getAttribute("content") ||
    wooPrice?.textContent?.trim() ||
    genericPrice?.textContent?.trim() ||
    undefined;

  return {
    title,
    url: canonicalUrl,
    image,
    price: price || undefined,
  };
}

export interface GenericFetchResult {
  products: RawSpyProduct[];
  debug: string[];
}

export async function fetchGenericProducts(
  baseUrl: string
): Promise<GenericFetchResult> {
  const debug: string[] = [];

  // Step 1: Discover sitemaps
  const sitemapUrls = await discoverSitemapUrls(baseUrl);
  debug.push(
    sitemapUrls.length > 0
      ? `Found ${sitemapUrls.length} sitemap URL(s)`
      : "No sitemap URLs found in robots.txt"
  );

  // Step 2: Try to get product URLs from sitemaps
  let productUrls = await fetchProductUrlsFromSitemaps(sitemapUrls);
  debug.push(
    productUrls.length > 0
      ? `Found ${productUrls.length} product URL(s) from sitemaps`
      : "No product URLs found in sitemaps"
  );

  // Step 3: If no product URLs from sitemaps, try homepage
  if (productUrls.length === 0) {
    const homepageUrls = await discoverProductUrlsFromHomepage(baseUrl);
    debug.push(
      homepageUrls.length > 0
        ? `Found ${homepageUrls.length} product URL(s) from homepage`
        : "No product links found on homepage"
    );
    productUrls = homepageUrls;
  }

  if (productUrls.length === 0) {
    return { products: [], debug };
  }

  // Step 4: Fetch each product page
  const results: RawSpyProduct[] = [];

  for (const productUrl of productUrls.slice(0, MAX_CANDIDATES)) {
    try {
      const { data: html } = await axios.get(productUrl, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": USER_AGENT },
      });

      const dom = new JSDOM(html);
      const { document } = dom.window;

      let product: Partial<RawSpyProduct> | null = extractProductFromJsonLd(
        document,
        productUrl
      );
      if (!product) {
        product = extractProductFromHtml(document, productUrl);
      }

      if (product && product.title) {
        results.push({
          externalId: product.externalId || undefined,
          normalizedUrl: product.url || productUrl,
          title: product.title,
          url: product.url || productUrl,
          slug: product.slug || undefined,
          price: product.price || undefined,
          image: product.image || undefined,
          images: product.image ? [product.image] : [],
          source: "generic",
        });
      }
    } catch {
      continue;
    }
  }

  debug.push(`Extracted ${results.length} product(s) from ${productUrls.length} page(s)`);
  return { products: results, debug };
}
