import axios from "axios";
import { RawSpyProduct } from "@/types/product-spy";

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  date_created: string;
  images: { src: string }[];
}

export async function fetchWooCommerceProducts(
  baseUrl: string
): Promise<RawSpyProduct[]> {
  const url = baseUrl.replace(/\/+$/, "");
  const apiUrl = `${url}/wp-json/wc/store/v1/products`;

  const { data } = await axios.get<WCProduct[]>(apiUrl, {
    params: { orderby: "date", order: "desc", per_page: 20 },
    timeout: 15000,
    headers: { "User-Agent": "WooTool-ProductSpy/1.0" },
  });

  return data.map((p) => ({
    externalId: String(p.id),
    title: p.name || "",
    url: p.permalink || "",
    slug: p.slug || "",
    price: p.price || undefined,
    image: p.images?.[0]?.src || undefined,
    images: p.images?.map((img) => img.src) || [],
    dateCreated: p.date_created || undefined,
    source: "woocommerce",
  }));
}

export async function isWooCommerceStore(url: string): Promise<boolean> {
  try {
    const baseUrl = url.replace(/\/+$/, "");
    const { status } = await axios.get(`${baseUrl}/wp-json/wc/store/v1/products`, {
      params: { per_page: 1 },
      timeout: 8000,
      headers: { "User-Agent": "WooTool-ProductSpy/1.0" },
    });
    return status === 200;
  } catch {
    return false;
  }
}
