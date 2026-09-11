"use client";

import { VideoJob, VideoJobStatus, YoutubePublishStatus } from "@/types/video";
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LinkOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  message,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import axios from "axios";

const statusColors: Record<VideoJobStatus, string> = {
  pending: "default",
  preparing: "processing",
  rendering: "processing",
  completed: "success",
  failed: "error",
};

const youtubeStatusColors: Record<YoutubePublishStatus, string> = {
  not_published: "default",
  publishing: "processing",
  published: "success",
  failed: "error",
};

interface JobListProps {
  jobs: VideoJob[];
  loading?: boolean;
  onDelete: (jobId: string) => void;
  onDeleteAll: () => void;
  onRefresh: () => void;
  deletingAll?: boolean;
}

export default function JobList({
  jobs,
  loading,
  onDelete,
  onDeleteAll,
  onRefresh,
  deletingAll,
}: JobListProps) {
  const hasCompletedJobs = jobs.some((j) => j.status === "completed");
  const hasActiveJobs = jobs.some(
    (j) => j.status === "pending" || j.status === "preparing" || j.status === "rendering"
  );

  const handleDownload = (jobId: string) => {
    window.open(`/api/video/download/${jobId}`, "_blank");
  };

  const handleCopyProductLink = async (productUrl: string) => {
    try {
      await navigator.clipboard.writeText(productUrl);
      message.success("Product link copied");
    } catch {
      message.error("Failed to copy link");
    }
  };

  const handleDownloadAll = () => {
    const completedIds = jobs.filter((j) => j.status === "completed").map((j) => j._id).join(",");
    if (!completedIds) {
      message.warning("No completed videos to download");
      return;
    }
    window.open(`/api/video/download-all?ids=${completedIds}`, "_blank");
  };

  const handleDeleteAll = () => {
    Modal.confirm({
      title: "Delete All Jobs",
      content: `Delete all ${jobs.length} video jobs? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => onDeleteAll(),
    });
  };

  const columns = [
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    {
      title: "Images",
      dataIndex: "images",
      key: "imageCount",
      width: 72,
      render: (images: string[]) => <Tag>{images?.length || 0}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: VideoJobStatus) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Progress",
      dataIndex: "progress",
      key: "progress",
      width: 180,
      render: (progress: number, record: VideoJob) => (
        <Progress
          percent={progress}
          size="small"
          status={
            record.status === "failed" ? "exception" : record.status === "completed" ? "success" : "active"
          }
        />
      ),
    },
    {
      title: "YouTube",
      dataIndex: "youtubeStatus",
      key: "youtubeStatus",
      width: 100,
      render: (youtubeStatus: YoutubePublishStatus | undefined, record: VideoJob) => {
        if (record.status !== "completed") return null;
        if (!youtubeStatus || youtubeStatus === "not_published") return <Tag>-</Tag>;
        return (
          <Tag color={youtubeStatusColors[youtubeStatus]}>
            {youtubeStatus === "published" && record.youtubeVideoId ? (
              <a
                href={`https://www.youtube.com/watch?v=${record.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                VIEW
              </a>
            ) : (
              youtubeStatus.toUpperCase()
            )}
          </Tag>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_: any, record: VideoJob) => (
        <Space size={4}>
          {record.status === "completed" && (
            <Tooltip title="Download">
              <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record._id!)} />
            </Tooltip>
          )}
          {record.productUrl && (
            <Tooltip title="Copy product link">
              <Button type="text" size="small" icon={<LinkOutlined />} onClick={() => handleCopyProductLink(record.productUrl!)} />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record._id!)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <VideoCameraOutlined />
          <span>Video Jobs</span>
          {hasActiveJobs && <Badge status="processing" text="Processing" />}
        </Space>
      }
      extra={
        jobs.length > 0 && (
          <Space>
            {hasCompletedJobs && (
              <Button icon={<CloudDownloadOutlined />} onClick={handleDownloadAll} size="small">
                Download All
              </Button>
            )}
            <Button danger icon={<DeleteOutlined />} loading={deletingAll} onClick={handleDeleteAll} size="small">
              Delete All
            </Button>
          </Space>
        )
      }
      size="small"
    >
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={jobs}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="small"
        scroll={{ x: 700 }}
        locale={{ emptyText: "No video jobs yet" }}
      />
    </Card>
  );
}
