import { endpoint } from '@/constant/endpoint';
import useSWR from 'swr';
import axios from 'axios';
import { VideoJob } from '@/types/video';

const fetcher = async (url: string) => {
  const { data } = await axios.get<{ jobs: VideoJob[] }>(url);
  return data.jobs;
};

export function useVideoJobs(options?: { websiteId?: string; autoRefresh?: boolean }) {
  const params = new URLSearchParams();
  if (options?.websiteId) params.set('websiteId', options.websiteId);

  const url = `${endpoint.videoJobs}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: options?.autoRefresh !== false ? 2000 : 0,
      revalidateOnFocus: true,
    }
  );

  return {
    jobs: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}
