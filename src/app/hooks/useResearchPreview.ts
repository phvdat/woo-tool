"use client";
import useSWR from "swr";
import axios from "axios";
import { endpoint } from "@/constant/endpoint";
import { ResearchTopic } from "@/types/research";

export interface ResearchPreviewInput {
  productName: string;
  category?: string;
  website?: string;
}

const fetcher = (url: string) => axios.get(url).then((r) => r.data);

/** Read-only view of the research cache, for debugging a stored topic. */
export function useResearchTopic(topicKey?: string) {
  const { data, error, isLoading } = useSWR(
    topicKey ? `${endpoint.researchTopics}?topicKey=${encodeURIComponent(topicKey)}` : null,
    fetcher,
  );

  return {
    topic: data as ResearchTopic | undefined,
    isLoading,
    isError: !!error,
  };
}

/** Runs a one-off research pass so the result can be inspected before enabling it. */
export function useResearchPreview() {
  return async (input: ResearchPreviewInput, forceRefresh = false) => {
    const response = await axios.post(endpoint.researchPreview, { ...input, forceRefresh });
    return response.data as ResearchTopic;
  };
}
