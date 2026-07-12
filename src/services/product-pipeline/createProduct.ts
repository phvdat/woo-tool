import dayjs from "dayjs";
import { AxiosInstance } from "axios";
import { WooCommerce } from "@/types/woo";

interface CreateProductParams {
  woo: AxiosInstance;
  product: WooCommerce;
}

export async function createProduct({
  woo,
  product,
}: CreateProductParams) {
  const payload = {
    name: product.Name,
    type: "simple",
    status: product["Published Date"] ? "future" : "publish",
    date: product["Published Date"]
      ? dayjs(product["Published Date"]).format("YYYY-MM-DDTHH:mm:ss")
      : undefined,
    description: product.Description,
    sku: product.SKU,
    regular_price: product["Regular price"],
    sale_price: product["Sale price"] || undefined,
    categories:
      product.Categories?.split(">")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((name) => ({ name })) ?? [],
    tags:
      product.Tags?.split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((name) => ({ name })) ?? [],
    images:
      product.Images?.split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((src) => ({ src })) ?? [],
    stock_quantity: product["Stock"] || undefined,
    manage_stock: !!product["Stock"],
    stock_status: product["Stock"] ? "instock" : undefined,
    catalog_visibility: "visible",
  };
  const { data } = await woo.post("/products", payload);
  return data;
}