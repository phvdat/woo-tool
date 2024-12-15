import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { WooWebsitePayload } from '../api/woo/website-config/route';

const fetcher = async (url: string, userEmail?: string) => {
  const { data } = await axios.get<WooWebsitePayload[]>(url, { params:{ userEmail }});
  return data;
};

export function useConfigWebsite(userEmail?:string) {
  const { data, error, isLoading, mutate } = useSWR(
    [endpoint.websiteConfigList, userEmail],
    ([endpoint, userEmail])=> fetcher(endpoint, userEmail)
  );

  return {
    websiteConfigList: data,
    isLoading,
    isError: error,
    mutate,
  };
}
