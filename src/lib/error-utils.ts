/**
 * Safely extract a readable error message from an unknown error value.
 * Avoids dumping entire error objects (Axios, request, socket, etc.).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

/**
 * Extract the Telegram API error description when available.
 * Falls back to the plain error message.
 *
 * node-telegram-bot-api errors may have:
 *   error.response.body.description  (Telegram API response)
 *   error.code                       (HTTP status code)
 */
export function getTelegramError(error: unknown): string {
  const anyErr = error as any;

  // Telegram API structured error from node-telegram-bot-api
  const telegramDesc = anyErr?.response?.body?.description;
  if (typeof telegramDesc === "string" && telegramDesc) {
    const code = anyErr?.response?.body?.error_code;
    return code ? `(${code}) ${telegramDesc}` : telegramDesc;
  }

  return getErrorMessage(error);
}
