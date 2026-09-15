import { RawSpyProduct } from "@/types/product-spy";
import { fetchWooCommerceProducts, isWooCommerceStore } from "./woocommerce";
import { fetchShopifyProducts, isShopifyStore } from "./shopify";
import { fetchShopBaseProducts, isShopBaseStore } from "./shopbase";
import { fetchTeeChipProducts, isTeeChipStore } from "./teechip";
import { fetchMerchizeProducts, isMerchizeStore } from "./merchize";
import { fetchMerchKingProducts, isMerchKingStore } from "./merchking";
import { fetchLattexProducts, isLattexStore } from "./lattex";
import { fetchGenericProducts, GenericFetchResult } from "./generic";
import { fetchFacebookAdsProducts } from "./facebook-ads";

export type Platform = "woocommerce" | "shopify" | "shopbase" | "teechip" | "merchize" | "merchking" | "lattex" | "generic";

export interface FetchResult {
  products: RawSpyProduct[];
  debug: string[];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function withFacebookFallback(
  url: string,
  result: FetchResult
): Promise<FetchResult> {
  if (result.products.length > 0) return result;
  const domain = extractDomain(url);
  const fb = await fetchFacebookAdsProducts(domain);
  return {
    products: fb.products,
    debug: [...result.debug, ...fb.debug],
  };
}

export async function detectPlatform(
  url: string
): Promise<{ platform: Platform; reason: string }> {
  // 1. WooCommerce
  const wooResult = await isWooCommerceStore(url);
  if (wooResult.detected) {
    return { platform: "woocommerce", reason: wooResult.reason };
  }

  // 2. Shopify
  const shopifyResult = await isShopifyStore(url);
  if (shopifyResult.detected) {
    return { platform: "shopify", reason: shopifyResult.reason };
  }

  // 3. ShopBase
  const shopbaseResult = await isShopBaseStore(url);
  if (shopbaseResult.detected) {
    return { platform: "shopbase", reason: shopbaseResult.reason };
  }

  // 4. TeeChip
  const teechipResult = await isTeeChipStore(url);
  if (teechipResult.detected) {
    return { platform: "teechip", reason: teechipResult.reason };
  }

  // 5. Merchize
  const merchizeResult = await isMerchizeStore(url);
  if (merchizeResult.detected) {
    return { platform: "merchize", reason: merchizeResult.reason };
  }

  // 6. MerchKing
  const merchkingResult = await isMerchKingStore(url);
  if (merchkingResult.detected) {
    return { platform: "merchking", reason: merchkingResult.reason };
  }

  // 7. Lattex
  const lattexResult = await isLattexStore(url);
  if (lattexResult.detected) {
    return { platform: "lattex", reason: lattexResult.reason };
  }

  // 8. Generic
  return { platform: "generic", reason: "No platform-specific signals detected" };
}

export async function fetchProducts(
  url: string,
  platform: Platform
): Promise<FetchResult> {
  if (platform === "woocommerce") {
    try {
      const products = await fetchWooCommerceProducts(url);
      if (products.length > 0) {
        return { products, debug: ["WooCommerce Store API returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "WooCommerce Store API returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `WooCommerce Store API error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  if (platform === "shopify") {
    try {
      const products = await fetchShopifyProducts(url);
      if (products.length > 0) {
        return { products, debug: ["Shopify /products.json returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "Shopify /products.json returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `Shopify /products.json error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  if (platform === "shopbase") {
    try {
      const products = await fetchShopBaseProducts(url);
      if (products.length > 0) {
        return { products, debug: ["ShopBase API returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "ShopBase API returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `ShopBase API error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  if (platform === "teechip") {
    try {
      const products = await fetchTeeChipProducts(url);
      if (products.length > 0) {
        return { products, debug: ["TeeChip page returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "TeeChip page returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `TeeChip fetch error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  if (platform === "merchize") {
    try {
      const products = await fetchMerchizeProducts(url);
      if (products.length > 0) {
        return { products, debug: ["Merchize page returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "Merchize page returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `Merchize fetch error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  if (platform === "merchking") {
    try {
      const products = await fetchMerchKingProducts(url);
      if (products.length > 0) {
        return { products, debug: ["MerchKing page returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "MerchKing page returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `MerchKing fetch error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  if (platform === "lattex") {
    try {
      const products = await fetchLattexProducts(url);
      if (products.length > 0) {
        return { products, debug: ["Lattex page returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          "Lattex page returned 0 products",
          ...generic.debug,
        ],
      });
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return withFacebookFallback(url, {
        products: generic.products,
        debug: [
          `Lattex fetch error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      });
    }
  }

  // Generic platform: generic → facebook-ads
  const generic = await fetchGenericProducts(url);
  return withFacebookFallback(url, generic);
}
