export interface WooCommerce {
  ID: string;
  Type: string;
  SKU: string;
  Name: string;
  Published: string;
  'Published Date'?: string;
  'Is featured?': string;
  'Visibility in catalog': string;
  'Short description': string;
  Description: string;
  'Date sale price starts': string;
  'Date sale price ends': string;
  'Tax status': string;
  'Tax class': string;
  'In stock?': string;
  Stock: string;
  'Low stock amount': string;
  'Backorders allowed?': string;
  'Sold individually?': string;
  'Weight (kg)': string;
  'Length (cm)': string;
  'Width (cm)': string;
  'Height (cm)': string;
  'Allow customer reviews?': string;
  'Purchase note': string;
  'Sale price': string;
  'Regular price': string;
  Categories: string;
  'Shipping class': string;
  Images: string;
  'Download limit': string;
  'Download expiry days': string;
  Parent: string;
  'Grouped products': string;
  Upsells: string;
  'Cross-sells': string;
  'External URL': string;
  'Button text': string;
  Position: string;
  Tags?: string;
  'Meta: rank_math_focus_keyword'?: string;
  'Choose Your Style'?: string;
  'Choose Your Style Data'?: string;
}



export interface AutoBlogConfig {
  enabled: boolean;
  cron: string;
  status: "draft" | "publish";
  postsPerRun: number
}

export interface ProductConfig {
  promptDescriptionProduct: string;
  promptTagsProduct: string;
  publicTime: string | Date;
  gapFrom: number;
  gapTo: number;
}

export enum CanvasPosition {
  northwest = "northwest",
  northeast = "northeast",
  southeast = "southeast",
  southwest = "southwest",
}

export interface WebsiteConfig {
  url: string;
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  logoPosition: CanvasPosition;
  imageWidth: number;
  imageHeight: number;
  shopName: string;
  quality: number;
  members?: string[];
  wpUsername: string;
  wpAppPassword: string;
  autoBlog: AutoBlogConfig;
  product: ProductConfig;
  backgroundMusicUrl?: string;
  youtubeDescriptionTemplate?: string;
  youtubeCommentTemplate?: string;
  owner: string;
  autoVideo?: {
    enabled: boolean;
  };
}

export interface WooWebsitePayload extends WebsiteConfig {
  _id?: string;
}
