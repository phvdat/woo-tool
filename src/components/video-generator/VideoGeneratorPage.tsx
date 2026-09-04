"use client";

import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import { useVideoJobs } from "@/app/hooks/useVideoJobs";
import Container from "@/components/commons/Container";
import { endpoint } from "@/constant/endpoint";
import { VideoJob, VideoJobStatus, VideoProduct } from "@/types/video";
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Image,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const { Text } = Typography;
const { Dragger } = Upload;

const statusColors: Record<VideoJobStatus, string> = {
  pending: "default",
  preparing: "processing",
  rendering: "processing",
  completed: "success",
  failed: "error",
};

export default function VideoGeneratorPage() {
  const { websiteConfigList, isLoading: loadingWebsites } = useConfigWebsite();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(
    null,
  );
  const [products, setProducts] = useState<VideoProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

    socket.on("video-progress", () => {
      refreshJobs();
    });
    socket.on("video-completed", () => {
      refreshJobs();
    });
    socket.on("video-error", () => {
      refreshJobs();
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshJobs]);

  const fetchProducts = useCallback(
    async (websiteId: string, pageNum: number) => {
      setLoadingProducts(true);
      try {
        const { data } = await axios.get(endpoint.videoProducts, {
          params: { websiteId, page: pageNum, per_page: 10 },
        });
        setProducts(data.products);
        setTotalPages(data.pagination.totalPages);
      } catch (error: any) {
        message.error(
          error?.response?.data?.error || "Failed to fetch products",
        );
      } finally {
        setLoadingProducts(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedWebsiteId) {
      setSelectedProductIds([]);
      fetchProducts(selectedWebsiteId, 1);
      setPage(1);
    }
  }, [selectedWebsiteId, fetchProducts]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (selectedWebsiteId) {
      fetchProducts(selectedWebsiteId, newPage);
    }
  };

  const handleGenerate = async () => {
    if (!selectedWebsiteId || selectedProductIds.length === 0) return;

    setGenerating(true);
    try {
      const { data } = await axios.post(endpoint.videoGenerate, {
        websiteId: selectedWebsiteId,
        productIds: selectedProductIds,
        config: {
          displayDuration,
          transitionDuration,
          kenBurns,
        },
      });

      message.success(`Created ${data.jobs.length} video job(s)`);
      setSelectedProductIds([]);
      refreshJobs();
    } catch (error: any) {
      message.error(
        error?.response?.data?.error || "Failed to generate videos",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (jobId: string) => {
    window.open(`/api/video/download/${jobId}`, "_blank");
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

  const handleDownloadAll = () => {
    const completedIds = jobs
      .filter((j) => j.status === "completed")
      .map((j) => j._id)
      .join(",");
    if (!completedIds) {
      message.warning("No completed videos to download");
      return;
    }
    window.open(`${endpoint.videoDownloadAll}?ids=${completedIds}`, "_blank");
  };

  const handleDeleteAll = () => {
    Modal.confirm({
      title: "Delete All",
      content: `Delete all ${jobs.length} video jobs? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
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
      },
    });
  };

  const handleCopyProductLink = async (productUrl: string) => {
    try {
      await navigator.clipboard.writeText(productUrl);
      message.success("Product link copied");
    } catch {
      message.error("Failed to copy link");
    }
  };

  const selectedWebsite = websiteConfigList?.find(
    (w) => w._id === selectedWebsiteId,
  );

  const productColumns = [
    {
      title: "Image",
      dataIndex: "images",
      key: "images",
      width: 80,
      render: (images: VideoProduct["images"]) =>
        images?.[0] ? (
          <Image
            src={images[0].src}
            alt={images[0].name || "Product image"}
            width={50}
            height={50}
            style={{ objectFit: "cover", borderRadius: 4 }}
            preview={false}
          />
        ) : (
          <div
            style={{
              width: 50,
              height: 50,
              background: "#f0f0f0",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            N/A
          </div>
        ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Images",
      dataIndex: "images",
      key: "imageCount",
      width: 80,
      render: (images: VideoProduct["images"]) => (
        <Tag>{images?.length || 0}</Tag>
      ),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
    },
  ];

  const jobColumns = [
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
      width: 80,
      render: (images: string[]) => <Tag>{images?.length || 0}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: VideoJobStatus) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Progress",
      dataIndex: "progress",
      key: "progress",
      width: 200,
      render: (progress: number, record: VideoJob) => (
        <Progress
          percent={progress}
          size="small"
          status={
            record.status === "failed"
              ? "exception"
              : record.status === "completed"
                ? "success"
                : "active"
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_: any, record: VideoJob) => (
        <Space>
          {record.status === "completed" && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record._id!)}
            >
              Download
            </Button>
          )}
          {record.productUrl && (
            <Tooltip title="Copy product link">
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => handleCopyProductLink(record.productUrl!)}
              />
            </Tooltip>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id!)}
          />
        </Space>
      ),
    },
  ];

  const hasCompletedJobs = jobs.some((j) => j.status === "completed");
  const hasActiveJobs = jobs.some(
    (j) =>
      j.status === "pending" ||
      j.status === "preparing" ||
      j.status === "rendering",
  );

  return (
    <Container title="Video Generator" size="lg">
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="Select Website & Products" size="small">
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div>
                <Text strong>Website:</Text>
                <Select
                  style={{ width: "100%", marginTop: 4 }}
                  placeholder="Select a website"
                  loading={loadingWebsites}
                  value={selectedWebsiteId}
                  onChange={setSelectedWebsiteId}
                  showSearch
                  optionFilterProp="label"
                  options={websiteConfigList?.map((w) => ({
                    value: w._id,
                    label: w.shopName,
                  }))}
                />
              </div>

              {selectedWebsiteId && (
                <>
                  <Table
                    rowKey="id"
                    columns={productColumns}
                    dataSource={products}
                    loading={loadingProducts}
                    rowSelection={{
                      selectedRowKeys: selectedProductIds,
                      onChange: (keys) =>
                        setSelectedProductIds(keys as number[]),
                    }}
                    pagination={{
                      current: page,
                      total: totalPages * 10,
                      pageSize: 10,
                      onChange: handlePageChange,
                      showSizeChanger: false,
                    }}
                    size="small"
                    scroll={{ x: 600 }}
                  />

                  <Space>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={generating}
                      disabled={selectedProductIds.length === 0}
                      onClick={handleGenerate}
                    >
                      Generate Videos ({selectedProductIds.length} selected)
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => refreshJobs()}
                    >
                      Refresh Jobs
                    </Button>
                  </Space>
                </>
              )}
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Video Settings" size="small">
            <Row gutter={[24, 16]}>
              <Col span={8}>
                <Text strong>Display Duration: {displayDuration}s</Text>
                <Slider
                  min={1}
                  max={6}
                  step={0.5}
                  value={displayDuration}
                  onChange={setDisplayDuration}
                />
              </Col>
              <Col span={8}>
                <Text strong>Transition: {transitionDuration}s</Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={transitionDuration}
                  onChange={setTransitionDuration}
                />
              </Col>
              <Col span={8}>
                <Text strong>Ken Burns Effect</Text>
                <div style={{ marginTop: 4 }}>
                  <Switch
                    checked={kenBurns}
                    onChange={setKenBurns}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>
              </Col>
            </Row>
            {selectedWebsite?.backgroundMusicUrl && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">
                  Background music: {selectedWebsite.shopName}
                </Text>
              </div>
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title={
              <Space>
                <VideoCameraOutlined />
                <span>Video Jobs</span>
                {hasActiveJobs && (
                  <Badge status="processing" text="Processing" />
                )}
              </Space>
            }
            extra={
              jobs.length > 0 && (
                <Space>
                  {hasCompletedJobs && (
                    <Button
                      icon={<CloudDownloadOutlined />}
                      onClick={handleDownloadAll}
                    >
                      Download All (ZIP)
                    </Button>
                  )}
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={deletingAll}
                    onClick={handleDeleteAll}
                  >
                    Delete All
                  </Button>
                </Space>
              )
            }
            size="small"
          >
            <Table
              rowKey="_id"
              columns={jobColumns}
              dataSource={jobs}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              size="small"
              scroll={{ x: 700 }}
              locale={{ emptyText: "No video jobs yet" }}
            />
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
