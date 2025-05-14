import { Product } from '@/app/(page)/convert-file/ConvertFile';
import dayjs from 'dayjs';
import _get from 'lodash/get';

export function handleErrorMongoDB(error: unknown) {
  const errorMessage = _get(
    error,
    'response.data.errorResponse.errmsg',
    'Something went wrong'
  );
  return { errorMessage };
}

export function normFile(event: unknown) {
  if (Array.isArray(event)) {
    return event;
  }
  return event && _get(event, 'fileList');
}

export function publishedTimeHelper(
  data: any[],
  after: number,
  gapFrom: number,
  gapTo: number
) {
  if (after == 0 && gapFrom == 0 && gapTo == 0) {
    return data.map((row) => {
      delete row['Published Date'];
      return row;
    });
  }
  let publishedDate = dayjs().add(after, 'minute');
  const result = data.map((row, index) => {
    const gapSeconds = gapFrom * 60 + Math.random() * (gapTo - gapFrom) * 60;
    if (index != 0) {
      publishedDate = publishedDate.add(gapSeconds, 'second');
    }

    return {
      ...row,
      'Published Date': publishedDate.format('YYYY-MM-DD HH:mm:ss'),
    };
  });
  return result;
}

export function convertToAcronym(input: string) {
  return input
    .split(/[-\s]+/) // Tách chuỗi thành mảng phân cách bởi khoang cách hoặc -
    .map((word) => word[0]) // Lấy ký tự đầu tiên của mỗi từ
    .join('') // Ghép các ký tự lại thành chuỗi
    .toLowerCase(); // Chuyển thành chữ thường
}

function normalizeWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word && !COMMON_WORDS.includes(word));
}
export function getMatchedWords(
  name: string,
  existingProducts: Product[]
): string[] {
  const nameWords = normalizeWords(name);
  const matchedWords = new Set<string>();

  for (const existingProduct of existingProducts) {
    const existingWords = normalizeWords(existingProduct.Name);
    for (const word of nameWords) {
      if (existingWords.includes(word)) {
        matchedWords.add(word);
      }
    }
  }

  return Array.from(matchedWords);
}

const COMMON_WORDS = [
  'hoodie',
  'tshirt',
  'shirt',
  'tee',
  'unisex',
  'women',
  'men',
  'kids',
  'cotton',
  'sleeve',
  'short',
  'long',
  'graphic',
  'print',
  'crewneck',
  'sweatshirt',
  'jacket',
  'sweater',
  'vintage',
  'zip',
  'fashion',
  'style',
  'oversized',
  '3d',

  // sports (NHL, NFL, MLB)
  'nhl',
  'nfl',
  'mlb',
  'hockey',
  'football',
  'baseball',
  'basketball',
  'puck',
  'ice',
  'stick',
  'bat',
  'glove',
  'helmet',
  'jersey',
  'touchdown',
  'cap',
  'hat',
  'ball',

  // sneakers / shoes
  'af1',
  'airmax',
  'air',
  'max',
  'aj1',
  '1',
  'jordan',
  'force',
  'retro',
  'low',
  'mid',
  'high',
  'stansmith',
  'stan smith',
  'adidas',
  'nike',
  'sneaker',
  'sneakers',
  'shoes',

  // accessories / lifestyle
  'tumbler',
  'mug',
  'cup',
  'bottle',
  'accessory',
  'stanley',

  // editions / time
  '2025',
  '2024',
  'limited',
  'edition',
  'premium',
  'official',
  'authentic',
  'new',
  'special',
  'custom',
  'name',
  'number',

  // colors
  'black',
  'white',
  'blue',
  'red',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'grey',
  'brown',
  'gold',
  'silver',
  'metal',
  'day',
  'personalized',

  'and',
  'or',
  'of',
  'the',
  'a',
  'an',
  'in',
  'on',
  'at',
  'to',
  'by',
  'for',
  'with',
  'from',
  'x',

  'I',
];
