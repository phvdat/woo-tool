import { SpyProductItem } from "@/app/hooks/useSpyProducts";

const STORAGE_KEY = "product-spy-selected";

export function getProductKey(item: SpyProductItem): string {
  if (item._id) return item._id;
  if (item.competitorId && item.externalId)
    return `${item.competitorId}:${item.externalId}`;
  return item.url?.toLowerCase().replace(/\/+$/, "") || "";
}

export function loadSelected(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr);
    return new Set();
  } catch {
    return new Set();
  }
}

export function saveSelected(selected: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected)));
  } catch {
    // ignore
  }
}
