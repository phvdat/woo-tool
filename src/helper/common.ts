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
