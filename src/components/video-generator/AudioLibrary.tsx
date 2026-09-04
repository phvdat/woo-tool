"use client";

import { AudioFile } from "@/types/video";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, message, Space, Table, Tag, Upload } from "antd";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

interface AudioLibraryProps {
  onAudioChange?: () => void;
}

export default function AudioLibrary({ onAudioChange }: AudioLibraryProps) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchAudioFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/video/audio");
      setAudioFiles(data.audioFiles || []);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to fetch audio files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudioFiles();
  }, [fetchAudioFiles]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post("/api/video/audio", formData);
      message.success("Audio uploaded successfully");
      fetchAudioFiles();
      onAudioChange?.();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to upload audio");
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDelete = async (audioId: string) => {
    try {
      await axios.delete(`/api/video/audio/${audioId}`);
      message.success("Audio deleted");
      fetchAudioFiles();
      onAudioChange?.();
    } catch (error: any) {
      message.error("Failed to delete audio");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "originalName",
      key: "originalName",
      ellipsis: true,
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_: any, record: AudioFile) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record._id!)}
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>Audio Library</span>
          <Tag>{audioFiles.length}</Tag>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Upload
          accept="audio/*"
          showUploadList={false}
          beforeUpload={(file) => {
            handleUpload(file as unknown as File);
            return false;
          }}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            Upload Audio
          </Button>
        </Upload>

        <Table
          rowKey="_id"
          dataSource={audioFiles}
          loading={loading}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: "No audio files uploaded" }}
          columns={columns}
        />
      </Space>
    </Card>
  );
}
