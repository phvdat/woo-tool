import { SpyProductItem } from "@/app/hooks/useSpyProducts";

const STORAGE_KEY = "product-spy-selected";

export interface SelectedEntry {
  key: string;
  url: string;
  title?: string;
  price?: string;
  image?: string;
  images?: string[];
  competitorName?: string;
  platform?: string;
  firstSeenAt?: string;
}

export function resolveImages(image?: string, images?: string[]): string[] {
  if (images && images.length > 0) return images;
  return image ? [image] : [];
}

export function getProductKey(item: SpyProductItem): string {
  if (item._id) return item._id;
  if (item.competitorId && item.externalId)
    return `${item.competitorId}:${item.externalId}`;
  return item.url?.toLowerCase().replace(/\/+$/, "") || "";
}

export function loadSelectedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(
        arr
          .filter((e: any) => e && typeof e.key === "string")
          .map((e: SelectedEntry) => e.key),
      );
    }
    // Legacy format: plain string array
    if (arr.length > 0 && typeof arr[0] === "string") {
      return new Set(arr);
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function loadSelectedUrls(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .filter((e: any) => e && typeof e.key === "string" && typeof e.url === "string")
        .map((e: SelectedEntry) => e.url);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveSelected(entries: SelectedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function saveToggle(item: SpyProductItem): Set<string> {
  const key = getProductKey(item);
  if (!key) return new Set();
  const current = loadSelectedEntries();
  const exists = current.findIndex((e) => e.key === key);
  let next: SelectedEntry[];
  if (exists >= 0) {
    next = current.filter((e) => e.key !== key);
  } else {
    next = [
      ...current,
      {
        key,
        url: item.url || "",
        title: item.title,
        price: item.price,
        image: item.image,
        images: item.images,
        competitorName: item.competitorName,
        platform: item.platform,
        firstSeenAt: item.firstSeenAt,
      },
    ];
  }
  saveSelected(next);
  return new Set(next.map((e) => e.key));
}

export function clearAllSelected(): void {
  saveSelected([]);
}

export function loadSelectedEntries(): SelectedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.filter(
        (e: any) => e && typeof e.key === "string" && typeof e.url === "string",
      );
    }
    return [];
  } catch {
    return [];
  }
}
