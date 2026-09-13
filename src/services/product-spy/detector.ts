import { RawSpyProduct } from "@/types/product-spy";
import { fetchWooCommerceProducts, isWooCommerceStore } from "./woocommerce";
import { fetchShopifyProducts, isShopifyStore } from "./shopify";
import { fetchGenericProducts, GenericFetchResult } from "./generic";

export type Platform = "woocommerce" | "shopify" | "generic";

export interface FetchResult {
  products: RawSpyProduct[];
  debug: string[];
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

  // 3. Generic
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
      return {
        products: generic.products,
        debug: [
          "WooCommerce Store API returned 0 products",
          ...generic.debug,
        ],
      };
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return {
        products: generic.products,
        debug: [
          `WooCommerce Store API error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      };
    }
  }

  if (platform === "shopify") {
    try {
      const products = await fetchShopifyProducts(url);
      if (products.length > 0) {
        return { products, debug: ["Shopify /products.json returned products"] };
      }
      const generic = await fetchGenericProducts(url);
      return {
        products: generic.products,
        debug: [
          "Shopify /products.json returned 0 products",
          ...generic.debug,
        ],
      };
    } catch (err: any) {
      const generic = await fetchGenericProducts(url);
      return {
        products: generic.products,
        debug: [
          `Shopify /products.json error: ${err?.message || "unknown"}`,
          ...generic.debug,
        ],
      };
    }
  }

  return fetchGenericProducts(url);
}
