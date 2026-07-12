import { WooCommerce } from "@/types/woo";
import { writeFileSync } from "fs";
import moment from "moment";
import * as XLSX from "xlsx";

interface ExportExcelParams {
  products: WooCommerce[];
  website: string;
}

interface ExportExcelResult {
  fileName: string;
  filePath: string;
}

export async function exportExcel({
  products,
  website,
}: ExportExcelParams): Promise<ExportExcelResult> {
  const worksheet = XLSX.utils.json_to_sheet(products);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "csv",
  });

  const date = moment().format("YYYY-MM-DD-HH-mm-ss");

  const fileName = `${website}-AI-${date}.csv`;

  writeFileSync(fileName, buffer);

  return {
    fileName,
    filePath: fileName,
  };
}