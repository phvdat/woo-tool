export interface SpyCompetitor {
  _id?: string;
  name: string;
  url: string;
  platform: "woocommerce" | "shopify" | "shopbase" | "teechip" | "merchize" | "merchking" | "lattex" | "generic";
  enabled: boolean;
  checkIntervalMinutes: number;
  lastCheckAt?: string;
  lastStatus?: "success" | "error";
  lastError?: string;
  createdAt: string;
}

export interface SpyProduct {
  _id?: string;
  competitorId: string;
  externalId?: string;
  normalizedUrl?: string;
  title: string;
  url: string;
  slug?: string;
  price?: string;
  image?: string;
  images?: string[];
  dateCreated?: string;
  source: string;
  firstSeenAt: string;
}

export interface SpyTelegramConfig {
  _id?: string;
  chatId: string;
}

export interface RawSpyProduct {
  externalId?: string;
  normalizedUrl?: string;
  title: string;
  url: string;
  slug?: string;
  price?: string;
  image?: string;
  images?: string[];
  dateCreated?: string;
  source: string;
}
