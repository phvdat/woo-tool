import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;

interface TeeChipProduct {
  productId?: number;
  name?: string;
  slug?: string;
  price?: number;
  image?: string;
  images?: string[];
}

interface TeeChipInitialState {
  campaign?: {
    id?: number;
    name?: string;
    slug?: string;
    products?: TeeChipProduct[];
  };
  products?: TeeChipProduct[];
  campaigns?: TeeChipProduct[];
}

export async function isTeeChipStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const baseUrl = url.replace(/\/+$/, "");

  // 1. Check for TeeChip-specific CDN assets in page HTML
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: 10000,
      headers: { "User-Agent": UA },
    });

    if (typeof html === "string") {
      // Strong signal: TeeChip template in CDN assets
      if (/templates-teechip-Layout-index-jsx/.test(html)) {
        return { detected: true, reason: "TeeChip Layout template found in CDN assets" };
      }

      // Strong signal: sl-retail namespace from 32pt.com CDN
      if (/cdn\.32pt\.com\/public\/sl-retail/.test(html)) {
        return { detected: true, reason: "TeeChip sl-retail CDN assets found" };
      }

      // Check page title for TeeChip branding
      const dom = new JSDOM(html);
      const { document } = dom.window;
      const title = document.querySelector("title")?.textContent || "";
      if (/TeeChip/i.test(title)) {
        return { detected: true, reason: "TeeChip found in page title" };
      }

      // Check for TeeChip-specific script chunks
      if (/templates-teechip/.test(html)) {
        return { detected: true, reason: "TeeChip template chunks found" };
      }
    }
  } catch {
    // homepage fetch failed
  }

  return { detected: false, reason: "No TeeChip signals detected" };
}

function extractProductsFromState(
  state: TeeChipInitialState
): TeeChipProduct[] {
  const products: TeeChipProduct[] = [];

  // Try campaign products
  if (state.campaign?.products) {
    products.push(...state.campaign.products);
  }

  // Try products array
  if (Array.isArray(state.products)) {
    products.push(...state.products);
  }

  // Try campaigns array
  if (Array.isArray(state.campaigns)) {
    products.push(...state.campaigns);
  }

  return products;
}

export async function fetchTeeChipProducts(
  url: string
): Promise<RawSpyProduct[]> {
  const baseUrl = url.replace(/\/+$/, "");
  const allProducts: RawSpyProduct[] = [];

  // Fetch the store page
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": UA },
    });

    if (typeof html !== "string") return allProducts;

    // Extract __INITIAL_STATE__ JSON
    const stateMatch = html.match(
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/
    );
    if (stateMatch) {
      try {
        const state: TeeChipInitialState = JSON.parse(stateMatch[1]);
        const products = extractProductsFromState(state);
        for (const p of products) {
          if (!p.name) continue;
          allProducts.push({
            externalId: p.productId ? String(p.productId) : undefined,
            title: p.name,
            url: p.slug ? `${baseUrl}/${p.slug}` : baseUrl,
            slug: p.slug || undefined,
            price: p.price ? String(p.price) : undefined,
            image: p.image || undefined,
            images: p.images || (p.image ? [p.image] : []),
            source: "teechip",
          });
        }
      } catch {
        // JSON parse failed
      }
    }

    // If no products from state, try to extract from HTML links
    if (allProducts.length === 0) {
      const dom = new JSDOM(html);
      const { document } = dom.window;
      const links = document.querySelectorAll('a[href]');
      const seen = new Set<string>();

      for (const link of Array.from(links)) {
        const href = link.getAttribute("href") || "";
        const fullUrl = href.startsWith("http")
          ? href
          : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;

        if (seen.has(fullUrl)) continue;
        if (!fullUrl.includes(baseUrl)) continue;
        if (fullUrl === baseUrl) continue;

        // Check if it looks like a product page (has query params or deep path)
        if (fullUrl.includes("?name=") || fullUrl.split("/").length > 3) {
          seen.add(fullUrl);
          const title = link.textContent?.trim() || "";
          if (title) {
            allProducts.push({
              title,
              url: fullUrl,
              source: "teechip",
            });
          }
        }
      }
    }
  } catch {
    // fetch failed
  }

  return allProducts;
}
