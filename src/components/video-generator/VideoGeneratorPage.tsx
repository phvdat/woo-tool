"use client";

import { useVideoJobs } from "@/app/hooks/useVideoJobs";
import Container from "@/components/commons/Container";
import AudioLibrary from "./AudioLibrary";
import ProductSelector from "./ProductSelector";
import VideoSettings from "./VideoSettings";
import JobList from "./JobList";
import { endpoint } from "@/constant/endpoint";
import { message } from "antd";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function VideoGeneratorPage() {
  const [selectedWebsiteId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const [displayDuration, setDisplayDuration] = useState(5);
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [kenBurns, setKenBurns] = useState(true);

  const { jobs, mutate: refreshJobs } = useVideoJobs({
    websiteId: selectedWebsiteId || undefined,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_APP_URL as string, {
      autoConnect: false,
    });
    socket.connect();
    socketRef.current = socket;

    socket.on("video-progress", () => refreshJobs());
    socket.on("video-completed", () => refreshJobs());
    socket.on("video-error", () => refreshJobs());

    return () => {
      socket.disconnect();
    };
  }, [refreshJobs]);

  const handleGenerate = async (websiteId: string, productIds: number[], _config: any) => {
    setGenerating(true);
    try {
      const { data } = await axios.post(endpoint.videoGenerate, {
        websiteId,
        productIds,
        config: { displayDuration, transitionDuration, kenBurns },
      });
      message.success(`Created ${data.jobs.length} video job(s)`);
      refreshJobs();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to generate videos");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await axios.delete(`/api/video/jobs/${jobId}`);
      message.success("Job deleted");
      refreshJobs();
    } catch (error: any) {
      message.error("Failed to delete job");
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await axios.delete(endpoint.videoJobs, {
        data: { ids: jobs.map((j) => j._id) },
      });
      message.success("All jobs deleted");
      refreshJobs();
    } catch (error: any) {
      message.error("Failed to delete jobs");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <Container
      title="Video Generator"
      subtitle="Create product videos automatically"
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <ProductSelector onGenerate={handleGenerate} generating={generating} />

        <VideoSettings
          displayDuration={displayDuration}
          transitionDuration={transitionDuration}
          kenBurns={kenBurns}
          onDisplayDurationChange={setDisplayDuration}
          onTransitionDurationChange={setTransitionDuration}
          onKenBurnsChange={setKenBurns}
        />

        <AudioLibrary />

        <JobList
          jobs={jobs}
          onDelete={handleDelete}
          onDeleteAll={handleDeleteAll}
          onRefresh={refreshJobs}
          deletingAll={deletingAll}
        />
      </div>
    </Container>
  );
}
