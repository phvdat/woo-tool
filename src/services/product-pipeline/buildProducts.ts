import axios from "axios";
import * as XLSX from "xlsx";
import { addWatermark } from "@/helper/website";
import { createWooRecord, WooFixedOption } from "@/helper/woo";
import { WooCommerce, WooWebsitePayload } from "@/types/woo";
import { getSocket } from "@/config/socket";
import { emitPipelineProgress, PipelineStep } from "./socket";

interface SheetData {
  Name: string;
  Images: string;
  Link?: string;
}

interface BuildProductsParams {
  file: File;
  website: WooWebsitePayload;
  categories: WooFixedOption[];
  socketId: string;
}

const socket = getSocket();
socket.connect();

export async function buildProducts({
  file,
  website,
  categories,
  socketId,
}: BuildProductsParams): Promise<WooCommerce[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as SheetData[];
  if (
    !rows.length ||
    !rows[0].hasOwnProperty("Name") ||
    !rows[0].hasOwnProperty("Images")
  ) {
    throw new Error("Invalid excel file");
  }
  const categoryMap = new Map(
    categories.map((item) => [item.category, item]),
  );
  const logoResponse = await axios.get(website.logoUrl, {
    responseType: "arraybuffer",
  });
  const uploadFolder = `/var/www/html/uploads/${website.shopName.replace(
    ".com",
    "",
  )}`;

  const products: WooCommerce[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as any;
    if (!row.Images) {
      continue;
    }
    const category = categoryMap.get(row.Categories);
    if (!category) {
      throw new Error(`Missing category at row ${index + 1}`);
    }
    const images = row.Images.split(",");

    const watermarkImages = await addWatermark({
      imageHeight: Number(website.imageHeight),
      imageWidth: Number(website.imageWidth),
      logoHeight: Number(website.logoHeight),
      logoWidth: Number(website.logoWidth),
      quality: Number(website.quality),
      shopName: website.shopName,
      images,
      name: row.Name,
      logoResponse,
      uploadFolder,
      category: row.Categories,
    });

    if (!watermarkImages) {
      continue;
    }

    products.push(
      createWooRecord(category, {
        ...row,
        Images: watermarkImages.join(","),
        "Image Origin": row.Images,
        Link: row.Link,
      }),
    );

    emitPipelineProgress({
      socketId,
      step: PipelineStep.BUILD_PRODUCTS,
      percent: Math.floor((products.length / rows.length) * 100),
      currentRow: index + 1,
      totalRows: rows.length,
    });
  }

  return products;
}