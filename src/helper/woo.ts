import { WooCommerce } from '@/types/woo';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface WooFixedOption {
  SKUPrefix: string;
  salePrice: string;
  regularPrice: string;
  category: string;
  published?: string;
  description?: string;
  shopID?: string;
}
export interface WooDynamicOption {
  Name: string;
  'Published Date': string;
  Images: string;
  [key: string]: string;
}

const regexTagsReplace = /[^a-zA-Z0-9]+/g;

function generateSKU(prefix: string) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < 10) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return `${prefix}-${result}`;
}

export function createWooRecord(
  {
    SKUPrefix,
    published = '1',
    salePrice,
    regularPrice,
    category,
    description = '',
  }: WooFixedOption,
  wooDynamic: WooDynamicOption
): WooCommerce {
  const categoryChild = category.split('>').pop()?.trim();
  const record: WooCommerce = {
    ID: '',
    Type: 'simple',
    SKU: generateSKU(SKUPrefix),
    ...wooDynamic,
    Published: published,
    Description: description,
    Categories: category,
    'Sale price': salePrice,
    'Regular price': regularPrice,
    'Meta: rank_math_focus_keyword': `${wooDynamic.Name},${categoryChild}`,
    'Is featured?': '0',
    'Visibility in catalog': 'visible',
    'Short description': '',
    'Date sale price starts': '',
    'Date sale price ends': '',
    'Tax status': 'taxable',
    'Tax class': '',
    'In stock?': '1',
    Stock: '',
    'Low stock amount': '',
    'Backorders allowed?': '0',
    'Sold individually?': '0',
    'Weight (kg)': '',
    'Length (cm)': '',
    'Width (cm)': '',
    'Height (cm)': '',
    'Allow customer reviews?': '1',
    'Purchase note': '',
    'Shipping class': '',
    'Download limit': '',
    'Download expiry days': '',
    Parent: '',
    'Grouped products': '',
    Upsells: '',
    'Cross-sells': '',
    'External URL': '',
    'Button text': '',
    Position: '0',
  };
  return record;
}

export const generateCSVBlob = async (data: any[]) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
  return new Blob([wbout], { type: 'text/csv;charset=utf-8' });
};

export async function handleDownloadFile(dataFile: any[], fileName?: string) {
  const date = moment().format('YYYY-MM-DD-HH-mm-ss');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataFile);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
  const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'text/csv;charset=utf-8;',
  });
  const finalFileName = `${fileName || 'woo'}-${date}.csv`;
  saveAs(blob, finalFileName);
}
