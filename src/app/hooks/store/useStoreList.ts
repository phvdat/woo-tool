import { WatermarkFormValue } from '@/components/woo/UpdateStoreListModal';
import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { StoreCollection } from './useStore';

const fetcher = async (url: string) => {
  const { data } = await axios.get<StoreCollection[]>(url);
  return data;
};

export function useStoreList() {
  const { data, error, isLoading, mutate } = useSWR(endpoint.store, fetcher);

  return {
    storeList: data,
    isLoading,
    isError: error,
    mutate,
  };
}
