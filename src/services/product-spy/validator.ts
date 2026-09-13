import { URL } from "url";

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
  /^localhost$/i,
];

function isPrivateIP(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return PRIVATE_IP_PATTERNS.some((p) => p.test(lower));
}

export function validateUrl(urlStr: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Only HTTP/HTTPS URLs are allowed" };
  }

  if (isPrivateIP(parsed.hostname)) {
    return { valid: false, error: "Private/internal network URLs are not allowed" };
  }

  if (!parsed.hostname || parsed.hostname.length < 3) {
    return { valid: false, error: "Invalid hostname" };
  }

  return { valid: true };
}
