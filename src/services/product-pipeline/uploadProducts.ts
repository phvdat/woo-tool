import axios from "axios";
import { WooCommerce, WooWebsitePayload } from "@/types/woo";
import { createProduct } from "./createProduct";
import { emitPipelineProgress, PIPELINE_PROGRESS, PipelineStep } from "./socket";

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

  const start = PIPELINE_PROGRESS.TELEGRAM;
  const end = PIPELINE_PROGRESS.UPLOAD_WOO;

  for (let index = 0; index < products.length; index++) {
    await createProduct({
      woo,
      product: products[index],
    });

    emitPipelineProgress({
      socketId,
      step: PipelineStep.UPLOAD_WOO,
      percent:
        start + ((index + 1) / products.length) * (end - start),
      currentRow: index + 1,
      totalRows: products.length,
    });
  }
}