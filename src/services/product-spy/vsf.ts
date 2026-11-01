import axios from "axios";
import { RawSpyProduct } from "@/types/product-spy";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const MAX_NEW_PRODUCTS = 400;
const REFRESH_LIMIT = 20;
const SEARCH_PATH =
  "/api/vue/catalog/vue_storefront_catalog/product/_search";
const IMAGE_PREFIX = "https://minio.storedfilezone.com/img/0/600/resize";
const SOURCE_INCLUDE =
  "id,name,url_key,url_path,sku,price,final_price,special_price,image,small_image,thumbnail,created_at,updated_at,status,visibility,type_id";

const SEARCH_REQUEST = JSON.stringify({
  query: {
    bool: {
      filter: {
        bool: {
          must: [
            { terms: { visibility: [3, 4] } },
            { terms: { status: [0, 1] } },
          ],
        },
      },
    },
  },
});

interface VsfProductSource {
  id?: string;
  name?: string;
  url_key?: string;
  url_path?: string;
  sku?: string;
  price?: number | string;
  final_price?: number | string;
  special_price?: number | string;
  image?: string;
  small_image?: string;
  thumbnail?: string;
  created_at?: string;
  updated_at?: string;
}

interface VsfHit {
  _id?: string;
  _source?: VsfProductSource;
}

interface VsfSearchResponse {
  hits?: {
    total?: { value?: number } | number;
    hits?: VsfHit[];
  };
}

export interface VsfFetchOptions {
  isKnown?: (externalId: string) => boolean | Promise<boolean>;
}

export interface VsfFetchResult {
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

function totalFrom(response: VsfSearchResponse): number {
  const total = response.hits?.total;
  if (typeof total === "number") return total;
  return Number(total?.value || 0);
}

function imageUrl(source: VsfProductSource): string | undefined {
  const raw = source.image || source.small_image || source.thumbnail;
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${IMAGE_PREFIX}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function sourceToProduct(
  hit: VsfHit,
  base: string
): RawSpyProduct | null {
  const source = hit._source;
  if (!source) return null;
  const urlKey = source.url_key || source.url_path;
  if (!urlKey) return null;

  const price =
    source.final_price ?? source.price ?? source.special_price ?? undefined;

  return {
    externalId: source.id || hit._id,
    title: source.name || urlKey.replace(/-/g, " "),
    url: `${base}/products/${urlKey}`,
    slug: urlKey,
    price: price === undefined ? undefined : String(price),
    image: imageUrl(source),
    images: imageUrl(source) ? [imageUrl(source) as string] : [],
    dateCreated: source.created_at,
    source: "vsf",
  };
}

export async function isVsFStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const base = normalizeBase(url);

  try {
    const response = await axios.get(base, {
      timeout: 20000,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
      responseType: "text",
    });
    const html = typeof response.data === "string" ? response.data : "";
    if (/plfpod\.com|localVSFApiEndpont|vue_storefront_catalog/i.test(html)) {
      return {
        detected: true,
        reason: "Vue Storefront / Ecomzi storefront detected",
      };
    }
  } catch {
    // Ignore detection probe failures.
  }

  return { detected: false, reason: "No Vue Storefront signals detected" };
}

export async function fetchVsFProducts(
  url: string,
  options: VsfFetchOptions = {}
): Promise<VsfFetchResult> {
  const base = normalizeBase(url);
  const endpoint = `${base}${SEARCH_PATH}`;
  const debug: string[] = [];
  const knownProducts: RawSpyProduct[] = [];
  const newProducts: RawSpyProduct[] = [];
  let total = 0;
  let complete = true;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    let response;
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        response = await axios.get<VsfSearchResponse>(endpoint, {
          timeout: REQUEST_TIMEOUT,
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
          },
          params: {
            from,
            size: PAGE_SIZE,
            sort: "created_at:desc",
            request: SEARCH_REQUEST,
            _source_include: SOURCE_INCLUDE,
          },
          validateStatus: () => true,
        });
        if (response.status === 200 && response.data?.hits) break;
        lastError = `status ${response.status}`;
      } catch (err: any) {
        lastError = err?.message || "unknown";
      }

      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }

    if (!response || response.status !== 200 || !response.data?.hits) {
      debug.push(
        `VSF product search failed at offset ${from}: ${lastError || "unknown"}`
      );
      complete = false;
      break;
    }

    total = totalFrom(response.data);
    const hits = response.data.hits.hits || [];
    if (hits.length === 0) break;

    for (const hit of hits) {
      const product = sourceToProduct(hit, base);
      if (!product) continue;

      const alreadyKnown = Boolean(
        options.isKnown &&
          product.externalId &&
          (await options.isKnown(product.externalId))
      );

      if (alreadyKnown) {
        if (knownProducts.length < REFRESH_LIMIT) knownProducts.push(product);
      } else if (newProducts.length < MAX_NEW_PRODUCTS) {
        newProducts.push(product);
      }
    }

    if (
      newProducts.length >= MAX_NEW_PRODUCTS &&
      (!options.isKnown || knownProducts.length >= REFRESH_LIMIT)
    ) {
      break;
    }
    if (hits.length < PAGE_SIZE) break;
    if (from + PAGE_SIZE >= total) break;
  }

  const products = [...knownProducts, ...newProducts];
  debug.push(
    `VSF catalog: ${total} product(s), ${newProducts.length} new, ${knownProducts.length} refreshed`
  );

  return { products, hasProducts: total > 0, complete, debug };
}
