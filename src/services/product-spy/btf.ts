import axios from "axios";
import { RawSpyProduct } from "@/types/product-spy";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 20000;
const MAX_PAGES = 50;
const MAX_PRODUCTS = 1200;

interface BtfProductObject {
  id?: number | string;
  name?: string;
  path?: string;
  image?: string | null;
  price?: string;
}

export interface BtfFetchOptions {
  isKnown?: (externalId: string) => boolean | Promise<boolean>;
}

export interface BtfFetchResult {
  products: RawSpyProduct[];
  hasProducts: boolean;
  complete: boolean;
  debug: string[];
}

function normalizeBase(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

function stringValue(value: string): string | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function objectFields(body: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  let start = 0;
  let depth = 0;
  let quote = "";
  let escaped = false;

  const add = (part: string) => {
    const separator = part.indexOf(":");
    if (separator === -1) return;
    const key = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(key)) return;

    if (raw.startsWith('"')) {
      const parsed = stringValue(raw);
      if (parsed !== null) fields[key] = parsed;
      return;
    }
    if (raw === "!0") {
      fields[key] = true;
      return;
    }
    if (raw === "!1") {
      fields[key] = false;
      return;
    }
    if (raw === "null") {
      fields[key] = null;
      return;
    }
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
      fields[key] = Number(raw);
    }
  };

  for (let i = 0; i <= body.length; i += 1) {
    const char = body[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      continue;
    }
    if ((char === "," && depth === 0) || i === body.length) {
      add(body.slice(start, i));
      start = i + 1;
    }
  }

  return fields;
}

export function parseBtfShopProducts(
  html: string,
  baseUrl: string,
): RawSpyProduct[] {
  const base = normalizeBase(baseUrl);
  const seen = new Set<string>();
  const products: RawSpyProduct[] = [];
  const objectPattern = /\$R\[\d+\]=\{/g;

  let match = objectPattern.exec(html);
  while (match) {
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let quote = "";
    let escaped = false;
    let end = bodyStart;

    for (; end < html.length; end += 1) {
      const char = html[end];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    if (depth !== 0) break;

    const fields = objectFields(html.slice(bodyStart, end)) as BtfProductObject;
    const id = fields.id === undefined || fields.id === null ? "" : String(fields.id);
    const path = typeof fields.path === "string" ? fields.path : "";
    const name = typeof fields.name === "string" ? fields.name.trim() : "";

    if (id && name && /^\/product\//i.test(path)) {
      const url = new URL(path, base).href;
      const key = id || url;
      if (!seen.has(key)) {
        seen.add(key);
        const image = typeof fields.image === "string" ? fields.image : undefined;
        products.push({
          externalId: id,
          normalizedUrl: url,
          title: name,
          url,
          slug: path.split("/").filter(Boolean).at(-1),
          price: typeof fields.price === "string" ? fields.price : undefined,
          image,
          images: image ? [image] : [],
          source: "btf",
        });
      }
    }

    match = objectPattern.exec(html);
    if (products.length >= MAX_PRODUCTS) break;
  }

  return products;
}

export function parseBtfTotalPages(html: string): number | null {
  const matches = Array.from(
    html.matchAll(/total:\d+,page:\d+,pages:(\d+)/g),
  );
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

async function fetchShopPage(base: string, page: number): Promise<string | null> {
  const url = page <= 1 ? `${base}/shop` : `${base}/shop?page=${page}`;
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      responseType: "text",
      validateStatus: () => true,
    });
    return response.status === 200 && typeof response.data === "string"
      ? response.data
      : null;
  } catch {
    return null;
  }
}

export async function isBtfStore(
  url: string,
): Promise<{ detected: boolean; reason: string }> {
  const base = normalizeBase(url);
  const html = await fetchShopPage(base, 1);
  if (!html) return { detected: false, reason: "BTF shop page unavailable" };

  const hasTsr =
    /data-tsr-stream-part|\$_TSR/.test(html) ||
    /tsr-scroll-restoration/.test(html);
  const hasProductArray = /products:\$R\[\d+\]=\[/.test(html);
  const hasProductPath = /"\/product\/[^"]+"/.test(html);

  if (hasTsr && hasProductArray) {
    return {
      detected: true,
      reason: hasProductPath
        ? "BTF storefront shop page with serialized product catalog"
        : "BTF storefront shop page with an empty serialized catalog",
    };
  }

  return { detected: false, reason: "No BTF storefront signals detected" };
}

export async function fetchBtfProducts(
  url: string,
  options: BtfFetchOptions = {},
): Promise<BtfFetchResult> {
  const base = normalizeBase(url);
  const debug: string[] = [];
  const products: RawSpyProduct[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const knownProducts: RawSpyProduct[] = [];
  let complete = true;
  let totalPages: number | null = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await fetchShopPage(base, page);
    if (!html) {
      debug.push(`Shop page ${page} failed`);
      complete = false;
      break;
    }

    if (page === 1) totalPages = parseBtfTotalPages(html);
    const pageProducts = parseBtfShopProducts(html, base);
    let added = 0;

    for (const product of pageProducts) {
      const id = product.externalId || "";
      if ((id && seenIds.has(id)) || seenUrls.has(product.url)) continue;
      if (id) seenIds.add(id);
      seenUrls.add(product.url);
      added += 1;

      const alreadyKnown = Boolean(
        options.isKnown && id && (await options.isKnown(id)),
      );
      if (alreadyKnown) {
        if (knownProducts.length < 20) knownProducts.push(product);
      } else if (products.length < MAX_PRODUCTS) {
        products.push(product);
      }
    }

    debug.push(`Shop page ${page}: ${pageProducts.length} product(s), ${added} unique`);

    if (pageProducts.length === 0 || added === 0) break;
    if (totalPages !== null && page >= totalPages) break;
    if (products.length >= MAX_PRODUCTS) break;
  }

  const allProducts = [...knownProducts, ...products];
  debug.push(
    `BTF catalog: ${allProducts.length} product(s), ${products.length} new, ${knownProducts.length} refreshed`,
  );

  return {
    products: allProducts,
    hasProducts: allProducts.length > 0,
    complete,
    debug,
  };
}
