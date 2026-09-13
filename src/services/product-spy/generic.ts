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

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const urls: string[] = [];

  try {
    const robotsUrl = `${baseUrl.replace(/\/+$/, "")}/robots.txt`;
    const { data: robots } = await axios.get(robotsUrl, {
      timeout: 5000,
      headers: { "User-Agent": USER_AGENT },
    });
    const sitemapMatches = robots.matchAll(/Sitemap:\s*(\S+)/gi);
    for (const match of sitemapMatches) {
      urls.push(match[1]);
    }
  } catch {
    // no robots.txt, continue
  }

  if (urls.length === 0) {
    urls.push(`${baseUrl.replace(/\/+$/, "")}/sitemap.xml`);
  }

  const productUrls: string[] = [];

  for (const sitemapUrl of urls.slice(0, 3)) {
    try {
      const { data } = await axios.get(sitemapUrl, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": USER_AGENT },
        responseType: "text",
      });

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

export async function fetchGenericProducts(
  baseUrl: string
): Promise<RawSpyProduct[]> {
  const productUrls = await fetchSitemapUrls(baseUrl);
  if (productUrls.length === 0) return [];

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

  return results;
}
