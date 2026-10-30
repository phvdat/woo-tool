export type WebsiteCheckStatus = "alive" | "dead" | "unavailable";

const DEAD_HTTP_STATUSES = new Set([404, 410]);
const DEAD_ERROR_CODES = new Set(["ENOTFOUND", "ECONNREFUSED"]);
const TIMEOUT_ERROR_CODES = new Set([
  "ABORT_ERR",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

/**
 * Competitor URLs are user input and can arrive JSON-escaped (`https:\/\/...`),
 * percent-encoded (`https%3A%2F%2F...`), missing a scheme, or with trailing
 * slashes. Canonicalise them to an absolute http(s) URL for the health probe.
 */
export function normalizeCompetitorUrl(rawUrl: string): string | null {
  if (typeof rawUrl !== "string") return null;

  let value = rawUrl.trim();
  if (!value) return null;

  value = value.replace(/\\\//g, "/");

  if (/^https?%3a/i.test(value)) {
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the original value when percent-decoding fails.
    }
  }

  value = value.replace(/^(https?):\/+/i, "$1://");

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `https://${value.replace(/^\/+/, "")}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;

  parsed.hash = "";
  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return parsed.toString().replace(/\/+$/, "");
}

export function classifyHttpStatus(status: number): WebsiteCheckStatus {
  if (status >= 200 && status <= 399) return "alive";
  if (DEAD_HTTP_STATUSES.has(status)) return "dead";
  return "unavailable";
}

function extractErrorCode(error: unknown): string | undefined {
  let current = error as
    | { code?: unknown; errno?: unknown; cause?: unknown }
    | undefined;

  for (let depth = 0; depth < 4 && current; depth++) {
    if (typeof current.code === "string") return current.code;
    if (typeof current.errno === "string") return current.errno;
    current = current.cause as typeof current;
  }

  return undefined;
}

function isTimeoutError(error: unknown): boolean {
  let current = error as
    | { name?: unknown; code?: unknown; cause?: unknown }
    | undefined;

  for (let depth = 0; depth < 4 && current; depth++) {
    if (current.name === "AbortError") return true;
    if (typeof current.code === "string" && TIMEOUT_ERROR_CODES.has(current.code)) {
      return true;
    }
    if (current.code === 20) return true;
    current = current.cause as typeof current;
  }

  return false;
}

/**
 * Only DNS-not-found and connection-refused prove a competitor is dead.
 * Everything else (timeouts, TLS errors, resets) is treated as temporarily
 * unavailable so a flaky network never deletes a live store.
 */
export function classifyFetchError(error: unknown): WebsiteCheckStatus {
  if (isTimeoutError(error)) return "unavailable";
  const code = extractErrorCode(error);
  if (code && DEAD_ERROR_CODES.has(code)) return "dead";
  return "unavailable";
}
