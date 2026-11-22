import axios from "axios";

export const REMOTE_IMAGE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRY_DELAY_MS = 4_000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface DownloadRemoteImageOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  referer?: string;
}

export interface RemoteImageDownload {
  buffer: Buffer;
  status: number;
  attempts: number;
}

export class RemoteImageDownloadError extends Error {
  readonly url: string;
  readonly status?: number;
  readonly attempts: number;

  constructor(
    url: string,
    attempts: number,
    status?: number,
    cause?: unknown,
  ) {
    const statusLabel =
      status === 403
        ? "HTTP 403 Forbidden"
        : status
          ? `HTTP ${status}`
          : "network error";
    super(
      `Failed to download image (${statusLabel}) after ${attempts} attempt${attempts === 1 ? "" : "s"}: ${url}`,
    );
    this.name = "RemoteImageDownloadError";
    this.url = url;
    this.status = status;
    this.attempts = attempts;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  get forbidden(): boolean {
    return this.status === 403;
  }
}

export function sourceReferer(imageUrl: string): string | undefined {
  try {
    return `${new URL(imageUrl).origin}/`;
  } catch {
    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

function isRetryable(status: number | undefined): boolean {
  if (status === undefined) return true;
  return RETRYABLE_STATUS.has(status);
}

export async function downloadRemoteImage(
  imageUrl: string,
  options: DownloadRemoteImageOptions = {},
): Promise<RemoteImageDownload> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const retryDelayMs = Math.max(
    0,
    options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
  );
  const referer = options.referer ?? sourceReferer(imageUrl);
  const headers: Record<string, string> = {
    "User-Agent": REMOTE_IMAGE_USER_AGENT,
    Accept:
      "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (referer) {
    headers.Referer = referer;
  }

  let attempts = 0;
  let lastError: unknown;
  let lastStatus: number | undefined;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const { data, status } = await axios.get<ArrayBuffer>(imageUrl, {
        headers,
        responseType: "arraybuffer",
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      });
      return {
        buffer: Buffer.isBuffer(data) ? data : Buffer.from(data),
        status,
        attempts,
      };
    } catch (error) {
      lastError = error;
      lastStatus = errorStatus(error);

      if (!isRetryable(lastStatus) || attempts >= maxAttempts) {
        break;
      }

      const delay = Math.min(
        MAX_RETRY_DELAY_MS,
        retryDelayMs * 2 ** (attempts - 1),
      );
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  throw new RemoteImageDownloadError(
    imageUrl,
    attempts,
    lastStatus,
    lastError,
  );
}
