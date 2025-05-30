import stringSimilarity from 'string-similarity';
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

export function getMatchedWordsForBestMatch(
  name: string,
  existingProducts: Product[]
): string {
  let bestSimilarity = 0;
  let bestMatchedProducts: string = '';

  for (const existingProduct of existingProducts) {
    const similarity = stringSimilarity.compareTwoStrings(
      name.toLowerCase(),
      existingProduct.Name.toLowerCase()
    );
    if (similarity >= bestSimilarity) {
      bestSimilarity = similarity;
      bestMatchedProducts = existingProduct.Name;
    }
  }
  return bestMatchedProducts;
}
