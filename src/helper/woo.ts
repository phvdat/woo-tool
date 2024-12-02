import { WooCommerce } from '@/types/woo';
import moment from 'moment';
import * as XLSX from 'xlsx';

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
  name: string;
  publishedDate: string;
  images: string;
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
  { name, images, publishedDate }: WooDynamicOption
): WooCommerce {
  const categoryChild = category.split('>').pop()?.trim();
  const record: WooCommerce = {
    ID: '',
    Type: 'simple',
    SKU: generateSKU(SKUPrefix),
    Name: name,
    Published: published,
    'Published Date': publishedDate,
    'Is featured?': '0',
    'Visibility in catalog': 'visible',
    'Short description': '',
    Description: description,
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
    'Sale price': salePrice,
    'Regular price': regularPrice,
    Categories: category,
    Tags: name.replaceAll(regexTagsReplace, ','),
    'Shipping class': '',
    Images: images,
    'Download limit': '',
    'Download expiry days': '',
    Parent: '',
    'Grouped products': '',
    Upsells: '',
    'Cross-sells': '',
    'External URL': '',
    'Button text': '',
    Position: '0',
    'Meta: rank_math_focus_keyword': `${name},${categoryChild}`,
  };
  return record;
}

export async function handleDownloadFile(dataFile: any[], fileName?: string) {
  const date = moment().format('YYYY-MM-DD-HH-mm-ss');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataFile);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
  const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName || 'woo'}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
