import { WooCommerce, WooWebsitePayload } from "@/types/woo";
import axios from "axios";
import { createProduct } from "./createProduct";
import {
  emitPipelineError,
  emitPipelineProgress,
  PipelineStep,
} from "./socket";
import { loadCategories } from "./loadCategories";

interface UploadProductsParams {
  products: WooCommerce[];
  website: WooWebsitePayload;
  socketId: string;
}

export async function uploadProducts({
  products,
  website,
  socketId,
}: UploadProductsParams): Promise<{ productIds: number[] }> {
  const woo = axios.create({
    baseURL: `${website.url}/wp-json/wc/v3`,
    auth: {
      username: website.wpUsername,
      password: website.wpAppPassword,
    },
    timeout: 60_000,
  });
  const categoryMap = await loadCategories(woo);
  const createdWooIds: number[] = [];

  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    try {
      const wooProduct = await createProduct({
        woo,
        product,
        categoryMap,
      });
      if (wooProduct?.id) {
        createdWooIds.push(wooProduct.id);
      }
    } catch (error: any) {

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unknown error";

      console.error(
        `[UPLOAD ERROR] Product "${product.Name}":`,
        error
      );

      emitPipelineError(
        socketId,
        `Upload failed: ${product.Name}\n${errorMessage}`
      );
    }

    emitPipelineProgress({
      socketId,
      step: PipelineStep.UPLOAD_WOO,
      percent: Math.floor(((index + 1) / products.length) * 100),
      currentRow: index + 1,
      totalRows: products.length,
    });
  }

  return { productIds: createdWooIds };
}