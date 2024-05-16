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
