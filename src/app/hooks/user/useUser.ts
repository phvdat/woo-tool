import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { UserCollection } from './useUserList';

const fetcher = async (url: string) => {
  const { data } = await axios.get(url);
  return data;
};

export function useUser(email: string) {
  const { data, error, isLoading, mutate } = useSWR<UserCollection>(
    `${endpoint.user}/${email}`,
    (url: string) => fetcher(url)
  );

  return {
    user: data,
    isLoading,
    isError: error,
    mutate,
  };
}
