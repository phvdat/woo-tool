import { WooCommerce, WooWebsitePayload } from "@/types/woo";
import axios from "axios";
import { createProduct } from "./createProduct";
import { emitPipelineProgress, PipelineStep } from "./socket";
import { loadCategories } from "./loadCategories";

interface UploadProductsParams {
  products: WooCommerce[];
  website: WooWebsitePayload;
  socketId: number;
}

export async function uploadProducts({
  products,
  website,
  socketId,
}: UploadProductsParams) {
  const woo = axios.create({
    baseURL: `${website.url}/wp-json/wc/v3`,
    auth: {
      username: website.wpUsername,
      password: website.wpAppPassword,
    },
    timeout: 60_000,
  });
  const categoryMap = await loadCategories(woo);

  for (let index = 0; index < products.length; index++) {
    await createProduct({
      woo,
      product: products[index],
      categoryMap
    });

    emitPipelineProgress({
      socketId,
      step: PipelineStep.UPLOAD_WOO,
      percent: Math.floor(((index + 1) / products.length) * 100),
      currentRow: index + 1,
      totalRows: products.length,
    });
  }
}