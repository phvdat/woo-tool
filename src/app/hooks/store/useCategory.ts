import { CategoryCollection } from '@/app/api/woo/categories-config/route';
import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';

const fetcher = async (url: string, _id: string) => {
  const { data } = await axios.get<CategoryCollection>(url, {
    params: { _id },
  });
  return data;
};

export function useCategory(_id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    [_id ? endpoint.categoryConfig : null, _id],
    ([url, _id]) => fetcher(url as string, _id as string)
  );
  return {
    category: data,
    isLoading,
    isError: error,
    mutate,
  };
}
