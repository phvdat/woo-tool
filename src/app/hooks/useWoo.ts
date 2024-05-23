import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooFormValuePayload } from '../api/woo/route';

const fetcher = async (url: string) => {
  const { data } = await axios.get<WooFormValuePayload[]>(url);
  return data;
};

export function useWoo() {
  const { data, error, isLoading, mutate } = useSWR(endpoint.woo, fetcher);
  console.log(data);

  return {
    woo: data?.[0],
    isLoading,
    isError: error,
    mutate,
  };
}
