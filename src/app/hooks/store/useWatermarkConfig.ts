import { WooWatermarkPayload } from '@/app/api/woo/watermark-config/route';
import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';

const fetcher = async (url: string) => {
  const { data } = await axios.get<WooWatermarkPayload[]>(url);
  return data;
};

export function useWatermarkConfig() {
  const { data, error, isLoading, mutate } = useSWR(
    endpoint.watermarkConfig,
    fetcher
  );

  return {
    watermarkConfig: data,
    isLoading,
    isError: error,
    mutate,
  };
}
