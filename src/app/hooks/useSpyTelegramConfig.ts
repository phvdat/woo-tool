import { endpoint } from "@/constant/endpoint";
import { SpyTelegramConfig } from "@/types/product-spy";
import axios from "axios";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const { data } = await axios.get(url);
  return data;
};

export function useSpyTelegramConfig() {
  const { data, error, isLoading, mutate } = useSWR<SpyTelegramConfig>(
    endpoint.spyTelegramConfig,
    fetcher
  );

  return {
    config: data,
    isLoading,
    isError: error,
    mutate,
  };
}
