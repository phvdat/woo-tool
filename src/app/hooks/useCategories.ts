import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooCategoryPayload } from '../api/woo/categories-config/route';

const fetcher = async (url: string, searchKeyword: string) => {
  const { data } = await axios.get<WooCategoryPayload[]>(url, {
    params: { searchKeyword },
  });
  return data;
};

export function useCategories(searchKeyword?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    [endpoint.categoryConfig, searchKeyword],
    ([url, searchKeyword]) => fetcher(url, searchKeyword as string)
  );

  return {
    categories:
      data?.sort((a, b) => a.templateName.localeCompare(b.templateName)) || [],
    isLoading,
    isError: error,
    mutate,
  };
}
