import { RawSpyProduct } from "@/types/product-spy";
import { fetchWooCommerceProducts, isWooCommerceStore } from "./woocommerce";
import { fetchGenericProducts, GenericFetchResult } from "./generic";

export type Platform = "woocommerce" | "generic";

export interface FetchResult {
  products: RawSpyProduct[];
  debug: string[];
}

export async function detectPlatform(
  url: string
): Promise<{ platform: Platform; reason: string }> {
  const result = await isWooCommerceStore(url);
  return {
    platform: result.detected ? "woocommerce" : "generic",
    reason: result.reason,
  };
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
      // WooCommerce API returned 0 products, try generic fallback
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
  return fetchGenericProducts(url);
}
