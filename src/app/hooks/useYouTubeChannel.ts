import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import useSWR from 'swr';

export interface YouTubeChannelStatus {
  connected: boolean;
  channelTitle?: string;
  channelId?: string;
  connectedByEmail?: string;
  updatedAt?: string;
  hasOauthConfig: boolean;
}

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
