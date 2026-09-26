import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const USER_AGENT = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;
const MAX_CANDIDATES = 30;
const MAX_SITEMAPS = 5;
const MAX_LISTING_PAGES = 5;
const MAX_IMAGES = 20;

const LISTING_PATHS = ["/collections", "/collections/all", "/shop", "/products"];

const PAGE_PARAM_KEYS = ["page", "page_num", "p", "pageno"];

const PRODUCT_SEGMENTS = ["product", "products", "item", "items"];

const NON_PRODUCT_SEGMENTS = [
  "all",
  "account",
  "about",
  "best-sellers",
  "bestsellers",
  "blog",
  "cart",
  "categories",
  "category",
  "checkout",
  "collection",
  "collections",
  "compare",
  "contact",
  "deals",
  "faq",
  "faqs",
  "gift-card",
  "gift-cards",
  "home",
  "login",
  "logout",
  "my-account",
  "new",
  "new-arrivals",
  "news",
  "offers",
  "order",
  "orders",
  "page",
  "pages",
  "register",
  "reviews",
  "sale",
  "sales",
  "search",
  "shop",
  "signup",
  "store",
  "stores",
  "tag",
  "tags",
  "wishlist",
];

const NEXT_LABEL_PATTERN = /^(next|older|more|›|»|→|>>>|\.{2,}|>)$/i;

const NON_PRODUCT_IMAGE_PATTERN =
  /(?:^|[\/_.\-])(logo|icon|sprite|placeholder|loading|spinner|spacer|blank|avatar|loader|favicon|pixel|noimage|no-image|transparent|payment|visa|mastercard|amex|paypal|stripe|social|share|cart|search|menu|arrow|star|rating)(?:[\/_.\-]|$)/i;

const PRODUCT_IMAGE_SELECTORS = [
  "[itemprop='image']",
  "[data-product-gallery] img",
  ".product-gallery img",
  ".product__media img",
  ".woocommerce-product-gallery img",
  "[class*='product-gallery'] img",
  "[class*='productGallery'] img",
  ".product-image img",
  ".product-images img",
  "#product img",
  "[class*='product-image'] img",
  "main img",
];

const PRODUCT_META_SELECTORS = [
  'meta[property="og:image"]',
  'meta[property="og:image:secure_url"]',
  'meta[name="twitter:image"]',
  'meta[name="twitter:image:src"]',
  'meta[itemprop="image"]',
];

const IMAGE_ATTRIBUTES = [
  "src",
  "data-src",
  "data-original",
  "data-image",
  "data-zoom-image",
  "data-large_image",
  "data-lazy-src",
  "srcset",
  "data-srcset",
];

function normalizeUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function stripHash(url: string): string {
  return url.split("#")[0];
}

function getPathSegments(url: string): string[] {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = stripHash(url).split("?")[0];
  }
  const segments: string[] = [];
  const parts = pathname.split("/");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) segments.push(parts[i].toLowerCase());
  }
  return segments;
}

// `/shop/<...>` only counts when the trailing segment looks like a product
// detail slug (file extension, numeric id suffix) or the path nests under a
// category. A bare `/shop` or a single category slug is not a product.
function isShopDetailPath(rest: string[]): boolean {
  if (rest.length === 0) return false;
  const last = rest[rest.length - 1];
  if (NON_PRODUCT_SEGMENTS.indexOf(last) !== -1) return false;
  if (/\.(?:html?|php|aspx?|jsp)$/i.test(last)) return true;
  if (/[-_]p?\d{2,}$/i.test(last)) return true;
  return rest.length >= 3;
}

export function isProductUrl(url: string): boolean {
  const segments = getPathSegments(url);
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (PRODUCT_SEGMENTS.indexOf(segment) !== -1) {
      // `/products/<slug>`, `/product/<slug>`, `/item/<slug>`, and nested
      // forms like `/collections/<name>/products/<slug>`. A trailing
      // `/products` with nothing after it, or a generic listing segment such
      // as `/products/all`, is a listing page and not a product.
      const next = i + 1 < segments.length ? segments[i + 1] : null;
      if (next && NON_PRODUCT_SEGMENTS.indexOf(next) === -1) return true;
    }
    if (segment === "shop" && isShopDetailPath(segments.slice(i + 1))) {
      return true;
    }
  }
  return false;
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
  const productUrls = new Set<string>();

  for (const sitemapUrl of sitemapUrls.slice(0, MAX_SITEMAPS)) {
    try {
      const { data, status } = await axios.get(sitemapUrl, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": USER_AGENT },
        responseType: "text",
        validateStatus: () => true,
      });
      if (status !== 200) continue;

      const xml = String(data);
      const locPattern = /<loc>\s*(.*?)\s*<\/loc>/gi;
      let match = locPattern.exec(xml);
      while (match) {
        const loc = match[1].trim();
        if (loc) {
          const full = normalizeUrl(loc, sitemapUrl) || loc;
          if (isProductUrl(full)) {
            productUrls.add(stripHash(full));
          }
        }
        match = locPattern.exec(xml);
      }
    } catch {
      continue;
    }
  }

  return Array.from(productUrls).slice(0, MAX_CANDIDATES);
}

function collectProductUrls(doc: Document, baseUrl: string): string[] {
  const urls = new Set<string>();
  const links = doc.querySelectorAll("a[href]");

  for (let i = 0; i < links.length; i++) {
    const href = links[i].getAttribute("href");
    if (!href) continue;
    const full = normalizeUrl(href, baseUrl);
    if (!full) continue;
    if (!isProductUrl(full)) continue;
    urls.add(stripHash(full));
  }

  return Array.from(urls);
}

async function discoverProductUrlsFromHomepage(
  baseUrl: string
): Promise<string[]> {
  const base = baseUrl.replace(/\/+$/, "");

  try {
    const { data: html } = await axios.get(base, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": USER_AGENT },
    });

    const dom = new JSDOM(String(html));
    const { document } = dom.window;

    return collectProductUrls(document, base).slice(0, MAX_CANDIDATES);
  } catch {
    // homepage fetch failed
    return [];
  }
}

function findPageParam(url: string): { key: string; value: number } | null {
  try {
    const parsed = new URL(url);
    const keys: string[] = [];
    parsed.searchParams.forEach((_value, key) => keys.push(key));
    for (const key of keys) {
      if (PAGE_PARAM_KEYS.indexOf(key.toLowerCase()) === -1) continue;
      const value = parsed.searchParams.get(key);
      if (value && /^\d+$/.test(value)) {
        return { key, value: parseInt(value, 10) };
      }
    }
  } catch {
    // not an absolute url
  }
  return null;
}

function setPageParam(url: string, key: string, value: number): string | null {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, String(value));
    return parsed.href;
  } catch {
    return null;
  }
}

function parsePathPageNumber(url: string): number | null {
  const segments = getPathSegments(url);
  if (segments.length === 0) return null;
  const last = segments[segments.length - 1];
  const match =
    last.match(/^(?:page|p)[-_]?(\d+)$/) || last.match(/^(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function incrementPathPage(url: string, next: number): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");
    const lastIndex = segments.length - 1;
    if (lastIndex < 0) return null;
    const last = segments[lastIndex];
    segments[lastIndex] = /^(?:page|p)[-_]?\d+$/i.test(last)
      ? last.replace(/\d+$/, String(next))
      : String(next);
    parsed.pathname = segments.join("/");
    return parsed.href;
  } catch {
    return null;
  }
}

interface PaginationHint {
  relNextUrl: string | null;
  nextParamUrl: string | null;
  nextPathUrl: string | null;
  paramKey: string | null;
  pageNumbers: number[];
  pathPageNumber: number | null;
}

function detectPagination(doc: Document, currentUrl: string): PaginationHint {
  const hint: PaginationHint = {
    relNextUrl: null,
    nextParamUrl: null,
    nextPathUrl: null,
    paramKey: null,
    pageNumbers: [],
    pathPageNumber: null,
  };

  const current = findPageParam(currentUrl);
  const currentPage = current ? current.value : parsePathPageNumber(currentUrl);
  // Page 1 of a listing is normally reachable without any parameter, so a
  // link to `?page_num=1` is not treated as "next".
  const minNext = currentPage === null || currentPage === undefined ? 2 : currentPage + 1;
  const numbers: number[] = [];
  let nextParamValue = Number.POSITIVE_INFINITY;
  let nextPathValue = Number.POSITIVE_INFINITY;

  const elements = doc.querySelectorAll("a[href], link[href]");
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const href = element.getAttribute("href");
    if (!href) continue;
    const full = normalizeUrl(href, currentUrl);
    if (!full) continue;

    const pageParam = findPageParam(full);
    if (pageParam) {
      if (!hint.paramKey) hint.paramKey = pageParam.key;
      if (numbers.indexOf(pageParam.value) === -1) {
        numbers.push(pageParam.value);
      }
      if (pageParam.value >= minNext && pageParam.value < nextParamValue) {
        nextParamValue = pageParam.value;
        hint.nextParamUrl = stripHash(full);
      }
      continue;
    }

    if (!isProductUrl(full)) {
      const pathPage = parsePathPageNumber(full);
      if (pathPage !== null) {
        hint.pathPageNumber = pathPage;
        if (pathPage >= minNext && pathPage < nextPathValue) {
          nextPathValue = pathPage;
          hint.nextPathUrl = stripHash(full);
        }
      }
    }

    const rel = (element.getAttribute("rel") || "").toLowerCase();
    const isRelNext = rel.split(/\s+/).indexOf("next") !== -1;
    if (!hint.relNextUrl && !isRelNext) {
      const label = [
        element.getAttribute("aria-label") || "",
        element.getAttribute("title") || "",
        element.textContent || "",
      ]
        .join(" ")
        .trim();
      if (NEXT_LABEL_PATTERN.test(label)) {
        hint.relNextUrl = stripHash(full);
      }
    }
  }

  numbers.sort((a, b) => a - b);
  hint.pageNumbers = numbers;
  return hint;
}

function pickNextListingUrl(
  currentUrl: string,
  hint: PaginationHint
): string | null {
  if (hint.relNextUrl) return hint.relNextUrl;
  if (hint.nextParamUrl) return hint.nextParamUrl;
  if (hint.nextPathUrl) return hint.nextPathUrl;

  // No usable next link: increment the detected page parameter instead.
  const current = findPageParam(currentUrl);
  const key = current ? current.key : hint.paramKey;
  if (key) {
    let target: number;
    if (current) {
      target = current.value + 1;
    } else {
      const higher = hint.pageNumbers.filter((n) => n >= 2);
      target = higher.length > 0 ? higher[0] : 2;
    }
    return setPageParam(currentUrl, key, target);
  }

  if (hint.pathPageNumber !== null) {
    return incrementPathPage(currentUrl, hint.pathPageNumber + 1);
  }

  return null;
}

interface CollectionDiscoveryResult {
  urls: string[];
  debug: string[];
}

async function discoverProductUrlsFromCollection(
  baseUrl: string
): Promise<CollectionDiscoveryResult> {
  const base = baseUrl.replace(/\/+$/, "");
  const debug: string[] = ["Trying collection/listing discovery"];
  const productUrls = new Set<string>();
  // Shared budget across all listing paths so one Product Spy request can
  // never fan out into hundreds of listing requests.
  let pagesFetched = 0;

  for (const path of LISTING_PATHS) {
    if (pagesFetched >= MAX_LISTING_PAGES) break;
    if (productUrls.size >= MAX_CANDIDATES) break;

    const visited = new Set<string>();
    let currentUrl: string | null = `${base}${path}`;

    while (currentUrl && pagesFetched < MAX_LISTING_PAGES) {
      if (visited.has(currentUrl)) break;
      visited.add(currentUrl);

      let listingDocument: Document | null = null;
      try {
        const { data, status } = await axios.get(currentUrl, {
          timeout: REQUEST_TIMEOUT,
          headers: { "User-Agent": USER_AGENT },
          responseType: "text",
          validateStatus: () => true,
        });
        if (status === 200) {
          listingDocument = new JSDOM(String(data)).window.document;
        }
      } catch {
        listingDocument = null;
      }
      pagesFetched += 1;
      if (!listingDocument) break;

      const pageProductUrls = collectProductUrls(listingDocument, currentUrl);
      const before = productUrls.size;
      for (let i = 0; i < pageProductUrls.length; i++) {
        productUrls.add(pageProductUrls[i]);
      }
      const added = productUrls.size - before;
      debug.push(`Found ${added} product URL(s) from collection page`);

      // No products, nothing new, or enough candidates: stop paginating this
      // listing path.
      if (added === 0) break;
      if (productUrls.size >= MAX_CANDIDATES) break;

      const next = pickNextListingUrl(
        currentUrl,
        detectPagination(listingDocument, currentUrl)
      );
      if (!next || visited.has(next)) break;
      currentUrl = next;
    }
  }

  debug.push(`Collection pagination discovered: ${pagesFetched} page(s)`);

  return {
    urls: Array.from(productUrls).slice(0, MAX_CANDIDATES),
    debug,
  };
}

function isProductType(type: unknown): boolean {
  if (typeof type === "string") {
    return /(^|\/)product$/i.test(type.trim());
  }
  if (Array.isArray(type)) {
    for (let i = 0; i < type.length; i++) {
      if (isProductType(type[i])) return true;
    }
  }
  return false;
}

function collectJsonLdProducts(value: unknown, out: any[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectJsonLdProducts(value[i], out);
    }
    return;
  }
  if (typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  if (node["@graph"]) collectJsonLdProducts(node["@graph"], out);
  if (isProductType(node["@type"])) out.push(node);
}

function parseJsonLdScripts(doc: Document): unknown[] {
  const blocks: unknown[] = [];
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const raw = scripts[i].textContent;
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const candidates = [trimmed];
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      candidates.push(trimmed.slice(start, end + 1));
    }

    for (let c = 0; c < candidates.length; c++) {
      try {
        blocks.push(JSON.parse(candidates[c]));
        break;
      } catch {
        continue;
      }
    }
  }
  return blocks;
}

function findJsonLdProduct(doc: Document): any | null {
  const blocks = parseJsonLdScripts(doc);
  const products: any[] = [];
  for (let i = 0; i < blocks.length; i++) {
    collectJsonLdProducts(blocks[i], products);
  }
  return products.length > 0 ? products[0] : null;
}

function addImageCandidate(
  raw: string,
  baseUrl: string,
  out: Set<string>
): void {
  const value = (raw || "").trim();
  if (!value) return;
  if (value.startsWith("#")) return;
  if (/^(?:data|javascript|mailto|tel):/i.test(value)) return;

  const full = normalizeUrl(value, baseUrl);
  if (!full) return;
  if (!/^https?:/i.test(full)) return;

  const clean = stripHash(full);
  if (clean === stripHash(baseUrl)) return;
  if (NON_PRODUCT_IMAGE_PATTERN.test(clean)) return;
  out.add(clean);
}

function addImageAttribute(
  raw: string,
  baseUrl: string,
  out: Set<string>
): void {
  const value = (raw || "").trim();
  if (!value) return;
  // `srcset`/`data-srcset` hold comma separated "<url> <descriptor>" entries.
  const parts = value.split(",");
  for (let i = 0; i < parts.length; i++) {
    addImageCandidate(parts[i].trim().split(/\s+/)[0], baseUrl, out);
  }
}

function collectJsonLdImageUrls(
  value: unknown,
  baseUrl: string,
  out: Set<string>
): void {
  if (!value) return;
  if (typeof value === "string") {
    addImageCandidate(value, baseUrl, out);
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectJsonLdImageUrls(value[i], baseUrl, out);
    }
    return;
  }
  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (typeof node.url === "string") {
      addImageCandidate(node.url, baseUrl, out);
    } else if (typeof node.contentUrl === "string") {
      addImageCandidate(node.contentUrl, baseUrl, out);
    }
  }
}

function extractProductImages(
  doc: Document,
  pageUrl: string,
  jsonLdProduct: any | null
): string[] {
  const images = new Set<string>();

  if (jsonLdProduct) {
    collectJsonLdImageUrls(jsonLdProduct.image, pageUrl, images);
  }

  for (const selector of PRODUCT_META_SELECTORS) {
    const content = doc.querySelector(selector)?.getAttribute("content");
    if (content) addImageAttribute(content, pageUrl, images);
  }

  const imageSrc = doc.querySelector("link[rel='image_src']")?.getAttribute("href");
  if (imageSrc) addImageCandidate(imageSrc, pageUrl, images);

  for (const selector of PRODUCT_IMAGE_SELECTORS) {
    const elements = doc.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      for (const attribute of IMAGE_ATTRIBUTES) {
        const value = elements[i].getAttribute(attribute);
        if (value) addImageAttribute(value, pageUrl, images);
      }
    }
  }

  return Array.from(images).slice(0, MAX_IMAGES);
}

function extractProductFromJsonLd(
  product: any,
  pageUrl: string
): Partial<RawSpyProduct> | null {
  if (!product) return null;
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const jsonLdImages = new Set<string>();
  collectJsonLdImageUrls(product.image, pageUrl, jsonLdImages);

  return {
    title: product.name || "",
    url: product.url || pageUrl,
    image: Array.from(jsonLdImages)[0],
    price: offers?.price || offers?.lowPrice || undefined,
    slug: product.sku || undefined,
    externalId: product.sku || undefined,
  };
}

function extractProductFromHtml(
  doc: Document,
  pageUrl: string
): Partial<RawSpyProduct> {
  const metaOgTitle = doc.querySelector('meta[property="og:title"]');
  const title =
    metaOgTitle?.getAttribute("content") ||
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    "";

  const metaOgImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  const imageSrc =
    doc.querySelector('link[rel="image_src"]')?.getAttribute("href") || "";
  const image = normalizeUrl(metaOgImage || imageSrc, pageUrl) || undefined;

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

  // Step 4: If still nothing, walk paginated collection/listing pages
  if (productUrls.length === 0) {
    const collection = await discoverProductUrlsFromCollection(baseUrl);
    for (const line of collection.debug) {
      debug.push(line);
    }
    productUrls = collection.urls;
    debug.push(
      productUrls.length > 0
        ? `Found ${productUrls.length} product URL(s) from collection pages`
        : "No product links found on collection pages"
    );
  }

  if (productUrls.length === 0) {
    return { products: [], debug };
  }

  // Step 5: Fetch product detail pages
  const results: RawSpyProduct[] = [];
  const extractedUrls = new Set<string>();

  for (const productUrl of productUrls.slice(0, MAX_CANDIDATES)) {
    if (results.length >= MAX_CANDIDATES) break;
    try {
      const { data: html } = await axios.get(productUrl, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": USER_AGENT },
      });

      const dom = new JSDOM(String(html));
      const { document } = dom.window;

      const jsonLdProduct = findJsonLdProduct(document);
      let product: Partial<RawSpyProduct> | null = extractProductFromJsonLd(
        jsonLdProduct,
        productUrl
      );
      if (!product || !product.title) {
        const fromHtml = extractProductFromHtml(document, productUrl);
        if (fromHtml.title) product = fromHtml;
      }
      if (!product || !product.title) continue;

      const images = extractProductImages(document, productUrl, jsonLdProduct);
      const resolvedUrl = product.url || productUrl;
      if (extractedUrls.has(stripHash(resolvedUrl))) continue;
      extractedUrls.add(stripHash(resolvedUrl));

      results.push({
        externalId: product.externalId || undefined,
        normalizedUrl: resolvedUrl,
        title: product.title,
        url: resolvedUrl,
        slug: product.slug || undefined,
        price: product.price || undefined,
        image: product.image || images[0],
        images,
        source: "generic",
      });
    } catch {
      continue;
    }
  }

  debug.push(
    `Extracted ${results.length} product(s) from ${productUrls.length} page(s)`
  );
  return { products: results, debug };
}
