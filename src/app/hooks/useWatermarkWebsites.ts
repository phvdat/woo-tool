import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooWatermarkPayload } from '../api/woo/watermark/route';

const fetcher = async (url: string) => {
  const { data } = await axios.get<WooWatermarkPayload[]>(url);
  return data;
};

export function useWatermarkWebsites() {
  const { data, error, isLoading, mutate } = useSWR(
    endpoint.watermarkList,
    fetcher
  );

  return {
    watermarkWebsites: data,
    isLoading,
    isError: error,
    mutate,
  };
}
