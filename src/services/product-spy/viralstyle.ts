import axios from "axios";
import { RawSpyProduct } from "@/types/product-spy";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 30000;
const API_ROOT = "https://api.customers.viralstyle.com/api/v3";
const PAGE_SIZE = 48;
const MAX_PAGES = 10;
const MAX_NEW_PRODUCTS = 480;
const REFRESH_LIMIT = 20;

export interface ViralstyleCampaign {
  campaign_id?: number | string;
  name?: string;
  uri?: string;
  creator_slug?: string;
  campaign_slug?: string;
  selling_price?: number | string;
  front_image?: string;
  back_image?: string;
  front_thumb_image?: string;
  back_thumb_image?: string;
  default_side?: string;
}

interface ViralstyleMarketplaceResponse {
  data?: {
    total_hits?: number;
    hits?: ViralstyleCampaign[];
  };
  jwt?: string;
}

export interface ViralstyleFetchOptions {
  isKnown?: (externalId: string) => boolean | Promise<boolean>;
}

export interface ViralstyleFetchResult {
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

function productUrl(campaign: ViralstyleCampaign, base: string): string | null {
  const uri = typeof campaign.uri === "string" ? campaign.uri.trim() : "";
  if (uri) {
    if (/^https?:\/\//i.test(uri)) return uri;
    return `${base}${uri.startsWith("/") ? "" : "/"}${uri}`;
  }

  const creator = campaign.creator_slug;
  const slug = campaign.campaign_slug;
  if (creator && slug) return `${base}/${creator}/${slug}`;
  return null;
}

function imageList(campaign: ViralstyleCampaign): string[] {
  const images = [
    campaign.front_image,
    campaign.back_image,
    campaign.front_thumb_image,
    campaign.back_thumb_image,
  ].filter((value): value is string => Boolean(value));
  return Array.from(new Set(images));
}

export function mapViralstyleCampaign(
  campaign: ViralstyleCampaign,
  baseUrl: string,
): RawSpyProduct | null {
  const id =
    campaign.campaign_id === undefined || campaign.campaign_id === null
      ? ""
      : String(campaign.campaign_id);
  const name = typeof campaign.name === "string" ? campaign.name.trim() : "";
  const url = productUrl(campaign, normalizeBase(baseUrl));
  if (!id || !name || !url) return null;

  const back = campaign.default_side?.toUpperCase() === "BACK";
  const image = back
    ? campaign.back_thumb_image || campaign.back_image
    : campaign.front_thumb_image || campaign.front_image;
  const images = imageList(campaign);
  const price =
    campaign.selling_price === undefined || campaign.selling_price === null
      ? undefined
      : String(campaign.selling_price);

  return {
    externalId: id,
    normalizedUrl: url,
    title: name,
    url,
    slug: campaign.campaign_slug,
    price,
    image,
    images,
    source: "viralstyle",
  };
}

export async function isViralstyleStore(
  url: string,
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
    if (/\/assets-customer\/(?:js|css)\//i.test(html)) {
      return {
        detected: true,
        reason: "Viralstyle marketplace storefront detected",
      };
    }
  } catch {
    // Ignore detection probe failures.
  }

  return { detected: false, reason: "No Viralstyle signals detected" };
}

async function getToken(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_ROOT}/token`, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": UA, Accept: "application/json" },
      validateStatus: () => true,
    });
    if (response.status !== 200) return null;
    return response.data?.data?.token || null;
  } catch {
    return null;
  }
}

async function getMarketplacePage(
  token: string,
  from: number,
): Promise<ViralstyleMarketplaceResponse | null> {
  try {
    const response = await axios.get<ViralstyleMarketplaceResponse>(
      `${API_ROOT}/public/marketplace`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        params: { from, size: PAGE_SIZE, sort: "age:desc" },
        validateStatus: () => true,
      },
    );
    if (response.status !== 200 || !response.data?.data?.hits) return null;
    return response.data;
  } catch {
    return null;
  }
}

export async function fetchViralstyleProducts(
  url: string,
  options: ViralstyleFetchOptions = {},
): Promise<ViralstyleFetchResult> {
  const base = normalizeBase(url);
  const debug: string[] = [];
  const products: RawSpyProduct[] = [];
  const knownProducts: RawSpyProduct[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  let complete = true;
  let total = 0;
  let offset = 0;

  const token = await getToken();
  if (!token) {
    return {
      products: [],
      hasProducts: false,
      complete: false,
      debug: ["Viralstyle API token request failed"],
    };
  }

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await getMarketplacePage(token, offset);
    if (!response) {
      debug.push(`Marketplace page ${page} failed at offset ${offset}`);
      complete = false;
      break;
    }

    const hits = response.data?.hits || [];
    total = response.data?.total_hits || total;
    if (hits.length === 0) {
      debug.push(`Marketplace page ${page}: no products at offset ${offset}`);
      break;
    }

    let added = 0;
    for (const campaign of hits) {
      const product = mapViralstyleCampaign(campaign, base);
      if (!product) continue;
      if (seenIds.has(product.externalId || "") || seenUrls.has(product.url)) {
        continue;
      }
      seenIds.add(product.externalId || "");
      seenUrls.add(product.url);
      added += 1;

      const alreadyKnown = Boolean(
        options.isKnown &&
          product.externalId &&
          (await options.isKnown(product.externalId)),
      );
      if (alreadyKnown) {
        if (knownProducts.length < REFRESH_LIMIT) knownProducts.push(product);
      } else if (products.length < MAX_NEW_PRODUCTS) {
        products.push(product);
      }
    }

    offset += hits.length;
    debug.push(
      `Marketplace page ${page}: ${hits.length} campaign(s), ${added} unique`,
    );

    if (products.length >= MAX_NEW_PRODUCTS) {
      debug.push(
        `Marketplace crawl capped at ${MAX_NEW_PRODUCTS} new product(s)`,
      );
      break;
    }
    if (total > 0 && offset >= total) break;
  }

  const allProducts = [...knownProducts, ...products];
  debug.push(
    `Viralstyle catalog: ${total} product(s), ${products.length} new, ${knownProducts.length} refreshed`,
  );

  return {
    products: allProducts,
    hasProducts: total > 0 || allProducts.length > 0,
    complete,
    debug,
  };
}
