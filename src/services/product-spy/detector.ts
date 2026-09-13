import { RawSpyProduct } from "@/types/product-spy";
import { fetchWooCommerceProducts, isWooCommerceStore } from "./woocommerce";
import { fetchGenericProducts } from "./generic";

export type Platform = "woocommerce" | "generic";

export async function detectPlatform(url: string): Promise<Platform> {
  const isWoo = await isWooCommerceStore(url);
  return isWoo ? "woocommerce" : "generic";
}

export async function fetchProducts(
  url: string,
  platform: Platform
): Promise<RawSpyProduct[]> {
  if (platform === "woocommerce") {
    try {
      return await fetchWooCommerceProducts(url);
    } catch {
      return fetchGenericProducts(url);
    }
  }
  return fetchGenericProducts(url);
}
