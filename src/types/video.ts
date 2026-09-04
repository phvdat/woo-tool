export interface VideoJobConfig {
  displayDuration: number;
  transitionDuration: number;
  kenBurns: boolean;
  backgroundMusicPath: string | null;
  outputWidth: number;
  outputHeight: number;
}

export type VideoJobStatus = 'pending' | 'preparing' | 'rendering' | 'completed' | 'failed';

export interface VideoJob {
  _id?: string;
  websiteId: string;
  productId: string;
  productName: string;
  images: string[];
  status: VideoJobStatus;
  progress: number;
  outputPath: string | null;
  error: string | null;
  productUrl: string | null;
  config: VideoJobConfig;
  createdAt: Date;
  completedAt: Date | null;
}

export interface VideoProduct {
  id: number;
  name: string;
  images: { id: number; src: string; name: string }[];
  status: string;
  price: string;
  sku: string;
}
