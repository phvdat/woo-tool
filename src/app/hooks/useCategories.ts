import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooCategoryPayload } from '../api/woo/categories/route';

const fetcher = async (url: string) => {
  const { data } = await axios.get<WooCategoryPayload[]>(url);
  return data;
};

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR(endpoint.category, fetcher);

  return {
    categories: data,
    isLoading,
    isError: error,
    mutate,
  };
}
