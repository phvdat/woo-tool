import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooFormValuePayload } from '../api/woo/woo-config/route';

const fetcher = async (url: string) => {
  const { data } = await axios.get<WooFormValuePayload[]>(url);
  return data;
};

export function useWoo() {
  const { data, error, isLoading, mutate } = useSWR(endpoint.wooConfig, fetcher);

  return {
    woo: data?.[0],
    isLoading,
    isError: error,
    mutate,
  };
}
