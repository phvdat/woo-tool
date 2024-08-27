import { CategoryItemProps } from '@/components/woo/CategoryItem';
import { WatermarkFormValue } from '@/components/woo/UpdateStoreListModal';
import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';

export interface StoreCollection {
  _id: string;
  watermark: WatermarkFormValue;
  categories: CategoryItemProps[];
}

const fetcher = async (url: string) => {
  const { data } = await axios.get<StoreCollection>(url);
  return data;
};

export function useStore(_id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    _id ? `${endpoint.store}/${_id}` : null,
    fetcher
  );

  return {
    store: data,
    isLoading,
    isError: error,
    mutate,
  };
}
