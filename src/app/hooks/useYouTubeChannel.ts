import { endpoint } from '@/constant/endpoint';
import { YouTubeChannelStatus } from '@/types/youtube';
import axios from 'axios';
import useSWR from 'swr';

export type { YouTubeChannelStatus, YouTubeProjectStatus } from '@/types/youtube';

const fetcher = async (url: string) => {
  const { data } = await axios.get<YouTubeChannelStatus>(url);
  return data;
};

export function useYouTubeChannel(siteId: string | null) {
  const url = siteId ? `${endpoint.youtubeStatus}?siteId=${siteId}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 0,
  });

  return {
    channelStatus: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
