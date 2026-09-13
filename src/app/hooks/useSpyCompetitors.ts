import { endpoint } from "@/constant/endpoint";
import { SpyCompetitor } from "@/types/product-spy";
import axios from "axios";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const { data } = await axios.get(url);
  return data;
};

export function useSpyCompetitors() {
  const { data, error, isLoading, mutate } = useSWR<SpyCompetitor[]>(
    endpoint.spyCompetitors,
    fetcher
  );

  return {
    competitors: data,
    isLoading,
    isError: error,
    mutate,
  };
}
