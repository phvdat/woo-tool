import { sendMessage } from '@/services/send-message';
import { WooCommerce } from '@/types/woo';
import * as XLSX from 'xlsx';
import _get from 'lodash/get';
import moment from 'moment';
import { WooCategoryPayload } from '@/app/api/woo/categories-config/route';
import { WooWatermarkPayload } from '@/app/api/woo/watermark-config/route';
import axios from 'axios';
import { endpoint } from '@/constant/endpoint';

export interface WooFixedOption {
  SKUPrefix: string;
  salePrice: string;
  regularPrice: string;
  category: string;
  published?: string;
  startDescription?: string;
  endDescription?: string;
}
export interface WooDynamicOption {
  description: string;
  name: string;
  publishedDate: string;
  images: string;
}

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
    startDescription = '',
    endDescription = '',
  }: WooFixedOption,
  { name, images, publishedDate, description }: WooDynamicOption
): WooCommerce {
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
    Description: startDescription + description + endDescription,
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
    Tags: name.replaceAll(/\s+/g, ','),
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
  };
  return record;
}

export async function handleDownloadFile(dataFile: WooCommerce[]) {
  const date = moment().format('YYYY-MM-DD-HH-mm-ss');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataFile);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
  const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `woo-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
