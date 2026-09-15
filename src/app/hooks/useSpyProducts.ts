import { endpoint } from "@/constant/endpoint";
import { SpyProduct } from "@/types/product-spy";
import axios from "axios";
import useSWR from "swr";

export interface SpyProductItem extends SpyProduct {
  competitorName?: string;
  platform?: string;
}

export interface SpyProductsResponse {
  products: SpyProductItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UseSpyProductsParams {
  from?: string;
  to?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}

function buildUrl(params: UseSpyProductsParams): string {
  const parts: string[] = [];
  if (params.from) parts.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) parts.push(`to=${encodeURIComponent(params.to)}`);
  if (params.platform) parts.push(`platform=${encodeURIComponent(params.platform)}`);
  if (params.page) parts.push(`page=${params.page}`);
  if (params.pageSize) parts.push(`pageSize=${params.pageSize}`);
  const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
  return `${endpoint.spyProducts}${qs}`;
}

const fetcher = async (url: string) => {
  const { data } = await axios.get(url);
  return data;
};

export function useSpyProducts(params: UseSpyProductsParams) {
  const url = buildUrl(params);

  const { data, error, isLoading, mutate } = useSWR<SpyProductsResponse>(
    url,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    response: data,
    isLoading,
    isError: error,
    mutate,
  };
}
