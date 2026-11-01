import axios from "axios";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 20000;
const REQUEST_DELAY_MS = 1200;
const MAX_RETRIES = 3;
const MAX_PRODUCTS = 200;
const MAX_PAGES_PER_TERM = 5;

// PDS stores have no public catalog/sitemap. Their search API is the only
// public way to list campaigns; broad stopwords plus product nouns cover the
// generated descriptions and titles without an authenticated endpoint.
const SEARCH_TERMS = [
  "and",
  "the",
  "for",
  "with",
  "shirt",
  "hoodie",
  "mug",
  "poster",
  "gift",
];

interface PdsMockup {
  color_id?: number;
  side?: number;
  front?: string | null;
  back?: string | null;
  checked?: boolean;
}

interface PdsCampaignProduct {
  id?: number;
  price?: number | string;
  enable?: number;
  default_color_id?: number;
  mockups?: string;
  extra_mockup?: string;
}

interface PdsCampaign {
  id?: number;
  slug?: string;
  title?: string;
  default_product?: number;
  campaign_products?: PdsCampaignProduct[];
  extra_mockup?: string;
  created_at?: string;
}

interface PdsSearchResponse {
  data?: PdsCampaign[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

export interface PdsFetchOptions {
  isKnown?: (externalId: string) => boolean | Promise<boolean>;
}

export interface PdsFetchResult {
  products: RawSpyProduct[];
  hasProducts: boolean;
  complete: boolean;
  debug: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function getCampaignProducts(campaign: PdsCampaign): PdsCampaignProduct[] {
  return (campaign.campaign_products || []).filter(
    (product) => product.enable !== 0,
  );
}

function pickDefaultProduct(
  campaign: PdsCampaign,
): PdsCampaignProduct | null {
  const products = getCampaignProducts(campaign);
  if (products.length === 0) return null;
  return (
    products.find((product) => product.id === campaign.default_product) ||
    products[0]
  );
}

function collectImageUrls(
  product: PdsCampaignProduct,
  campaign: PdsCampaign,
): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const url = value.trim();
    if (!/^https?:\/\//i.test(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };

  const mockups = parseJsonArray<PdsMockup>(product.mockups);
  const preferred =
    mockups.find(
      (mockup) =>
        mockup.color_id === product.default_color_id &&
        mockup.front &&
        (mockup.side === 0 || mockup.side === undefined),
    ) ||
    mockups.find((mockup) => mockup.front) ||
    mockups[0];

  if (preferred?.front) add(preferred.front);

  for (const mockup of mockups) {
    add(mockup.front);
    add(mockup.back);
  }

  for (const extra of parseJsonArray<PdsMockup>(campaign.extra_mockup)) {
    if (extra.checked === false) continue;
    add(extra.front);
    add(extra.back);
  }

  for (const extra of parseJsonArray<PdsMockup>(product.extra_mockup)) {
    if (extra.checked === false) continue;
    add(extra.front);
    add(extra.back);
  }

  return images;
}

function campaignToProduct(
  campaign: PdsCampaign,
  baseUrl: string,
): RawSpyProduct | null {
  if (!campaign.id || !campaign.slug || !campaign.title) return null;

  const product = pickDefaultProduct(campaign);
  const images = product ? collectImageUrls(product, campaign) : [];

  const price =
    product?.price !== undefined && product?.price !== null
      ? String(product.price)
      : undefined;

  return {
    externalId: String(campaign.id),
    title: campaign.title,
    url: `${baseUrl}/campaign/${campaign.slug}`,
    normalizedUrl: `${baseUrl}/campaign/${campaign.slug}`,
    slug: campaign.slug,
    price,
    image: images[0],
    images,
    dateCreated: campaign.created_at,
    source: "pds",
  };
}

async function getJsonWithRetry(
  url: string,
  debug: string[],
): Promise<PdsSearchResponse | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { status, data, headers } = await axios.get<PdsSearchResponse>(url, {
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": UA, Accept: "application/json" },
        validateStatus: () => true,
      });

      if (status === 200 && data && typeof data === "object") return data;

      if (status === 429) {
        const retryAfter = Number(headers?.["retry-after"]);
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 5000 * (attempt + 1);
        debug.push(`Search API rate-limited, waiting ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      debug.push(`Search API returned HTTP ${status}`);
      return null;
    } catch (err: any) {
      debug.push(`Search API request failed: ${err?.message || "unknown"}`);
      if (attempt === MAX_RETRIES) return null;
      await sleep(1000 * (attempt + 1));
    }
  }

  return null;
}

export async function isPdsStore(
  url: string,
): Promise<{ detected: boolean; reason: string }> {
  const base = url.replace(/\/+$/, "");

  try {
    const { data: html } = await axios.get(base, {
      timeout: 15000,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
    });

    if (typeof html === "string") {
      if (/\/shop-v2\/assets\//i.test(html)) {
        return { detected: true, reason: "PDS shop-v2 assets found in homepage" };
      }
      if (/shop-campaign-detail\.js|shop-home\.js/i.test(html)) {
        return { detected: true, reason: "PDS shop bundle found in homepage" };
      }
      if (/pdscdn\.com/i.test(html)) {
        return { detected: true, reason: "PDS CDN assets found in homepage" };
      }
    }
  } catch {
    // homepage fetch failed; try the API signal below
  }

  try {
    const { status, data } = await axios.get(`${base}/api/home`, {
      timeout: 12000,
      headers: { "User-Agent": UA, Accept: "application/json" },
      validateStatus: () => true,
    });

    if (
      status === 200 &&
      data &&
      typeof data === "object" &&
      ("homeBanner" in data ||
        "numberOfCampaignInCategory" in data ||
        "categoriesNeedMigrate" in data)
    ) {
      return { detected: true, reason: "PDS home API responded" };
    }
  } catch {
    // API fetch failed
  }

  return { detected: false, reason: "No PDS signals detected" };
}

export async function fetchPdsProducts(
  url: string,
  options: PdsFetchOptions = {},
): Promise<PdsFetchResult> {
  const base = url.replace(/\/+$/, "");
  const debug: string[] = [];
  const seen = new Map<string, PdsCampaign>();
  const isKnown = options.isKnown;
  let complete = true;

  for (const term of SEARCH_TERMS) {
    if (seen.size >= MAX_PRODUCTS) break;

    for (let page = 1; page <= MAX_PAGES_PER_TERM; page++) {
      if (seen.size >= MAX_PRODUCTS) break;

      const endpoint = `${base}/api/campaign-search/store:${encodeURIComponent(
        term,
      )}?match_whole_word=false&page=${page}`;
      const response = await getJsonWithRetry(endpoint, debug);
      if (!response) {
        complete = false;
        break;
      }
      if (!Array.isArray(response.data)) {
        complete = false;
        break;
      }
      if (response.data.length === 0) break;

      let added = 0;
      let unknown = 0;

      for (const campaign of response.data) {
        if (getCampaignProducts(campaign).length === 0) continue;

        const id = String(campaign.id);
        if (!seen.has(id)) {
          seen.set(id, campaign);
          added += 1;
        }

        if (!isKnown || !(await isKnown(id))) unknown += 1;
      }

      if (added === 0 || unknown === 0) break;
      if (!response.last_page || page >= response.last_page) break;

      await sleep(REQUEST_DELAY_MS);
    }

    if (term !== SEARCH_TERMS[SEARCH_TERMS.length - 1]) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const products: RawSpyProduct[] = [];
  for (const campaign of Array.from(seen.values())) {
    const product = campaignToProduct(campaign, base);
    if (product) products.push(product);
  }

  debug.push(
    `PDS campaign API returned ${seen.size} campaign(s), ${products.length} new`,
  );

  return { products, hasProducts: seen.size > 0, complete, debug };
}
