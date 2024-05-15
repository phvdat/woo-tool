import { WooCommerce } from '@/types/woo';

export interface WooFixedOption {
  SKUPrefix: string;
  salePrice: string;
  regularPrice: string;
  category: string;
  published?: string;
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
    Tags: '',
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
