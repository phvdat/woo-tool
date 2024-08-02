import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';
import { UsersPayload } from './useUsers';

const fetcher = async (url: string, email: string) => {
  const { data } = await axios.get(url, { params: { email } });
  return data;
};

export function useUser(email: string) {
  const { data, error, isLoading, mutate } = useSWR<UsersPayload>(
    [endpoint.user, email],
    ([url, email]) => fetcher(url, email as string)
  );

  return {
    user: data,
    isLoading,
    isError: error,
    mutate,
  };
}
