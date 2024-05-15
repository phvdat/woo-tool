import { sendMessage } from '@/services/send-message';
import { WooCommerce } from '@/types/woo';
import * as XLSX from 'xlsx';
import _get from 'lodash/get';

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

export async function handleCreateFileWoo(
  file: any,
  apiKey: string,
  promptQuestion: string
) {
  const promise = new Promise<WooCommerce[]>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = async (e) => {
      const bufferArray = e.target?.result;
      const wb = XLSX.read(bufferArray, {
        type: 'buffer',
      });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const processedData: any = [];
      for (const row of data) {
        const rowData = row as any;
        const keyWord: string = rowData['Name'];
        const question = promptQuestion.replaceAll('{key}', keyWord);
        const data = await sendMessage(question, apiKey);
        const content = _get(data, 'choices[0].message.content').replaceAll(
          '*',
          ''
        );
        processedData.push({ ...rowData, ChatGPTcontent: content });
      }
      resolve(processedData);
    };
    fileReader.onerror = (error) => {
      reject(error);
    };
  });
  const data = await promise;
  return data;
}

export async function handleDownloadFile(dataFile: WooCommerce[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataFile);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'processed_file.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
