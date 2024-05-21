import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';

export interface UsersPayload {
  _id: string;
  email: string;
}

const fetcher = async (url: string) => {
  const { data } = await axios.get(url);
  return data;
};

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<UsersPayload[]>(
    endpoint.users,
    fetcher
  );

  return {
    users: data,
    isLoading,
    isError: error,
    mutate,
  };
}
