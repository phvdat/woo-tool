export interface Trend {
  keyword: string;
  traffic: number;
}

export interface SelectedTrend {
  keyword: string;
  reason: string;
}

export interface BlogArticle {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  metaDescription: string;
}