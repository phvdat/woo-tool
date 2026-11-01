import axios from "axios";
import puppeteer, { Page } from "puppeteer";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";
import {
  extractProductFromJsonLd,
  extractProductImages,
  findJsonLdProduct,
} from "./generic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 20000;
const NAV_TIMEOUT = 45000;
const CHALLENGE_TIMEOUT = 20000;
const MAX_SITEMAPS = 12;
const MAX_PRODUCT_DETAILS = 40;
const REFRESH_LIMIT = 10;
const SITEMAP_PATTERN = /sitemap.*\.xml/i;

interface BrowserTextResponse {
  status: number;
  contentType: string;
  text: string;
  finalUrl: string;
}

interface ShoplineEntry {
  url: string;
  externalId: string;
  title?: string;
  image?: string;
  lastmod?: string;
}

export interface ShoplineFetchOptions {
  isKnown?: (externalId: string) => boolean | Promise<boolean>;
}

export interface ShoplineFetchResult {
  products: RawSpyProduct[];
  hasProducts: boolean;
  complete: boolean;
  debug: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBase(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

function decodeXmlOnce(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function decodeXml(value: string): string {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) decoded = decodeXmlOnce(decoded);
  return decoded.trim();
}

function decodeUrl(value: string): string {
  return decodeXml(value);
}

function isCloudflareChallenge(status: number, body: string): boolean {
  if (status !== 403 && status !== 429 && status !== 503) return false;
  return /just a moment|attention required|cf-chl|challenge-platform|checking your browser|verify you are human/i.test(
    body
  );
}

async function detectShoplineWithBrowser(
  base: string
): Promise<{ detected: boolean; reason: string }> {
  try {
    return await withBrowser(base, async (fetchText, effectiveBase) => {
      const robots = await fetchText(`${effectiveBase}/robots.txt`);
      if (/shopline/i.test(robots.text)) {
        return {
          detected: true,
          reason: "Shopline platform declared in robots.txt",
        };
      }

      const home = await fetchText(effectiveBase);
      if (
        /myshopline\.com|cdn\.myshopline\.com|\/shopline\//i.test(home.text)
      ) {
        return {
          detected: true,
          reason: "Shopline assets found in homepage",
        };
      }

      return { detected: false, reason: "No Shopline signals detected" };
    });
  } catch {
    return { detected: false, reason: "No Shopline signals detected" };
  }
}

export async function isShoplineStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const base = normalizeBase(url);

  try {
    const response = await axios.get(`${base}/robots.txt`, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
      responseType: "text",
    });
    const text = typeof response.data === "string" ? response.data : "";
    if (/shopline/i.test(text)) {
      return {
        detected: true,
        reason: "Shopline platform declared in robots.txt",
      };
    }
    if (isCloudflareChallenge(response.status, text)) {
      return detectShoplineWithBrowser(base);
    }
  } catch (err: any) {
    const text =
      typeof err?.response?.data === "string" ? err.response.data : "";
    if (isCloudflareChallenge(err?.response?.status, text)) {
      return detectShoplineWithBrowser(base);
    }
  }

  try {
    const response = await axios.get(base, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
      responseType: "text",
    });
    const html = typeof response.data === "string" ? response.data : "";
    if (/myshopline\.com|cdn\.myshopline\.com|\/shopline\//i.test(html)) {
      return {
        detected: true,
        reason: "Shopline assets found in homepage",
      };
    }
    if (isCloudflareChallenge(response.status, html)) {
      return detectShoplineWithBrowser(base);
    }
  } catch (err: any) {
    const html =
      typeof err?.response?.data === "string" ? err.response.data : "";
    if (isCloudflareChallenge(err?.response?.status, html)) {
      return detectShoplineWithBrowser(base);
    }
  }

  return { detected: false, reason: "No Shopline signals detected" };
}

function parseSitemapRoots(robots: string): string[] {
  const roots: string[] = [];
  for (const line of robots.split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap:\s*(\S+)/i);
    if (match && SITEMAP_PATTERN.test(match[1])) {
      roots.push(decodeUrl(match[1]));
    }
  }
  return Array.from(new Set(roots));
}

function parseSitemapIndex(xml: string): string[] {
  const out: string[] = [];
  const blocks = xml.match(/<sitemap\b[\s\S]*?<\/sitemap>/gi) || [];
  for (const block of blocks) {
    const loc = block.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i);
    if (loc) out.push(decodeUrl(loc[1]));
  }
  return out;
}

function handleFromProductUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    const match = parsed.pathname.match(/\/products\/([^/]+)/i);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function parseEntries(xml: string): ShoplineEntry[] {
  const out: ShoplineEntry[] = [];
  const blocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) || [];
  for (const block of blocks) {
    const loc = block.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i);
    if (!loc) continue;
    const productUrl = decodeUrl(loc[1]);
    const externalId = handleFromProductUrl(productUrl);
    if (!externalId) continue;

    const image = block.match(
      /<image:loc>\s*([\s\S]*?)\s*<\/image:loc>/i
    );
    const title = block.match(
      /<image:title>\s*([\s\S]*?)\s*<\/image:title>/i
    );
    const lastmod = block.match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i);

    out.push({
      url: productUrl,
      externalId,
      title: title ? decodeXml(title[1]) : undefined,
      image: image ? decodeUrl(image[1]) : undefined,
      lastmod: lastmod ? decodeXml(lastmod[1]) : undefined,
    });
  }
  return out;
}

async function waitForChallenge(page: Page): Promise<void> {
  const deadline = Date.now() + CHALLENGE_TIMEOUT;
  await sleep(1000);
  while (Date.now() < deadline) {
    const title = await page.title().catch(() => "");
    const challengeTitle =
      /just a moment|attention required|checking your browser|verify you are human/i.test(
        title
      );
    if (!challengeTitle) {
      const form = await page
        .$("#challenge-form, #cf-challenge-running, #cf-please-wait")
        .catch(() => null);
      if (!form) return;
    }
    await sleep(1000);
  }
}

async function withBrowser<T>(
  base: string,
  fn: (
    fetchText: (url: string) => Promise<BrowserTextResponse>,
    effectiveBase: string
  ) => Promise<T>
): Promise<T> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1366, height: 900 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(base, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await waitForChallenge(page);
    const effectiveBase = new URL(page.url()).origin;

    const fetchText = async (
      target: string
    ): Promise<BrowserTextResponse> => {
      let absolute: string;
      try {
        absolute = new URL(target, effectiveBase).toString();
      } catch {
        absolute = target;
      }
      try {
        return await page.evaluate(async (url) => {
          const response = await fetch(url, {
            credentials: "include",
            redirect: "follow",
            headers: {
              accept:
                "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
            },
          });
          return {
            status: response.status,
            contentType: response.headers.get("content-type") || "",
            text: await response.text(),
            finalUrl: response.url,
          };
        }, absolute);
      } catch (err: any) {
        return {
          status: 0,
          contentType: "",
          text: "",
          finalUrl: absolute,
        };
      }
    };

    return await fn(fetchText, effectiveBase);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function fetchShoplineProducts(
  url: string,
  options: ShoplineFetchOptions = {}
): Promise<ShoplineFetchResult> {
  const base = normalizeBase(url);
  const debug: string[] = [];

  return withBrowser(base, async (fetchText, effectiveBase) => {
    const robots = await fetchText(`${effectiveBase}/robots.txt`);
    const roots = robots.status === 200 ? parseSitemapRoots(robots.text) : [];
    if (roots.length === 0) roots.push(`${effectiveBase}/sitemap.xml`);

    const queue = Array.from(new Set(roots));
    const visited = new Set<string>();
    const entries = new Map<string, ShoplineEntry>();

    while (queue.length > 0 && visited.size < MAX_SITEMAPS) {
      const sitemapUrl = queue.shift();
      if (!sitemapUrl || visited.has(sitemapUrl)) continue;
      visited.add(sitemapUrl);

      const response = await fetchText(sitemapUrl);
      if (response.status !== 200 || !response.text) {
        debug.push(
          `Shopline sitemap ${sitemapUrl} returned ${response.status}`
        );
        continue;
      }

      if (/<sitemapindex\b/i.test(response.text)) {
        const children = parseSitemapIndex(response.text).filter((child) =>
          /product/i.test(child)
        );
        for (const child of children) {
          if (!visited.has(child) && queue.length < MAX_SITEMAPS) {
            queue.push(child);
          }
        }
        continue;
      }

      for (const entry of parseEntries(response.text)) {
        entries.set(entry.url, entry);
      }
    }

    debug.push(
      `Shopline sitemaps: ${entries.size} product URL(s) from ${visited.size} sitemap(s)`
    );

    const sorted = Array.from(entries.values()).sort((a, b) => {
      const left = a.lastmod || "";
      const right = b.lastmod || "";
      return right.localeCompare(left);
    });

    const refreshLimit = Math.min(REFRESH_LIMIT, MAX_PRODUCT_DETAILS);
    const knownSelected: ShoplineEntry[] = [];
    const unknownSelected: ShoplineEntry[] = [];
    const unknownLimit = MAX_PRODUCT_DETAILS - refreshLimit;
    let knownCount = 0;

    for (const entry of sorted) {
      const alreadyKnown = Boolean(
        options.isKnown && (await options.isKnown(entry.externalId))
      );
      if (alreadyKnown) {
        knownCount += 1;
        if (knownSelected.length < refreshLimit) knownSelected.push(entry);
      } else if (unknownSelected.length < unknownLimit) {
        unknownSelected.push(entry);
      }

      if (
        knownSelected.length >= refreshLimit &&
        unknownSelected.length >= unknownLimit
      ) {
        break;
      }
    }

    const selected = [...knownSelected, ...unknownSelected];

    if (knownCount > 0) {
      debug.push(
        `Shopline found ${knownCount} already-known product(s); refreshing ${knownSelected.length}`
      );
    }

    const products: RawSpyProduct[] = [];
    for (const entry of selected) {
      const product: RawSpyProduct = {
        externalId: entry.externalId,
        title: entry.title || entry.externalId.replace(/-/g, " "),
        url: entry.url,
        slug: entry.externalId,
        image: entry.image,
        images: entry.image ? [entry.image] : [],
        source: "shopline",
      };

      const response = await fetchText(entry.url);
      if (
        response.status === 200 &&
        /html/i.test(response.contentType || "text/html")
      ) {
        try {
          const dom = new JSDOM(response.text, { url: entry.url });
          const doc = dom.window.document;
          const jsonLd = findJsonLdProduct(doc);
          const extracted = extractProductFromJsonLd(jsonLd, entry.url);
          const images = extractProductImages(doc, entry.url, jsonLd);

          if (extracted?.title) product.title = extracted.title;
          if (extracted?.price) product.price = extracted.price;
          if (extracted?.image) product.image = extracted.image;
          if (images.length > 0) {
            product.images = images;
            if (!product.image) product.image = images[0];
          }
        } catch {
          debug.push(`Shopline failed to parse ${entry.url}`);
        }
      } else {
        debug.push(
          `Shopline product ${entry.url} returned ${response.status}`
        );
      }

      products.push(product);
    }

    debug.push(
      `Shopline fetched ${products.length} new product detail page(s)`
    );

    return {
      products,
      hasProducts: entries.size > 0,
      complete: true,
      debug,
    };
  });
}
