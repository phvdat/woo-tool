import { SettingFormValues } from '@/app/(page)/settings/Settings';
import { StoreItemProps } from '@/components/woo/StoreItem';
import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';

export interface UserCollection {
  _id: string;
  email: string;
  stores: Omit<StoreItemProps, '_userId'>[];
  settings: SettingFormValues;
}

const fetcher = async (url: string) => {
  const { data } = await axios.get(url);
  return data;
};

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<UserCollection[]>(
    endpoint.user,
    fetcher
  );

  return {
    users: data,
    isLoading,
    isError: error,
    mutate,
  };
}
