import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooWebsitePayload } from "@/types/woo";

const fetcher = async (url: string) => {
  const { data } = await axios.get<WooWebsitePayload[]>(url);
  return data;
};

export function useConfigWebsite() {
  const { data, error, isLoading, mutate } = useSWR(
    [endpoint.websiteConfigList],
    ([endpoint])=> fetcher(endpoint)
  );

  return {
    websiteConfigList: data,
    isLoading,
    isError: error,
    mutate,
  };
}
