"use client";

import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import EmptyState from "@/components/commons/EmptyState";
import { endpoint } from "@/constant/endpoint";
import { VideoProduct } from "@/types/video";
import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, Image, message, Row, Select, Space, Table, Tag } from "antd";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

interface ProductSelectorProps {
  onGenerate: (websiteId: string, productIds: number[], config: any) => Promise<void>;
  generating: boolean;
}

export default function ProductSelector({ onGenerate, generating }: ProductSelectorProps) {
  const { websiteConfigList, isLoading: loadingWebsites } = useConfigWebsite();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [products, setProducts] = useState<VideoProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async (websiteId: string, pageNum: number) => {
    setLoadingProducts(true);
    try {
      const { data } = await axios.get(endpoint.videoProducts, {
        params: { websiteId, page: pageNum, per_page: 10 },
      });
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      setSelectedProductIds([]);
      fetchProducts(selectedWebsiteId, 1);
      setPage(1);
    }
  }, [selectedWebsiteId, fetchProducts]);

  const handleGenerate = async () => {
    if (!selectedWebsiteId || selectedProductIds.length === 0) return;
    await onGenerate(selectedWebsiteId, selectedProductIds, {});
    setSelectedProductIds([]);
  };

  const columns = [
    {
      title: "Image",
      dataIndex: "images",
      key: "images",
      width: 64,
      render: (images: VideoProduct["images"]) =>
        images?.[0] ? (
          <Image
            src={images[0].src}
            alt={images[0].name || "Product image"}
            width={44}
            height={44}
            style={{ objectFit: "cover", borderRadius: 6 }}
            preview={false}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              background: "#F3F4F6",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#9CA3AF",
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
      width: 72,
      render: (images: VideoProduct["images"]) => <Tag>{images?.length || 0}</Tag>,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
    },
  ];

  return (
    <Card title="Select Website & Products" size="small">
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Select
            style={{ width: "100%" }}
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

        {selectedWebsiteId ? (
          <>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={products}
              loading={loadingProducts}
              rowSelection={{
                selectedRowKeys: selectedProductIds,
                onChange: (keys) => setSelectedProductIds(keys as number[]),
              }}
              pagination={{
                current: page,
                total: totalPages * 10,
                pageSize: 10,
                onChange: (newPage) => {
                  setPage(newPage);
                  fetchProducts(selectedWebsiteId, newPage);
                },
                showSizeChanger: false,
              }}
              size="small"
              scroll={{ x: 500 }}
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
                onClick={() => fetchProducts(selectedWebsiteId, page)}
              >
                Refresh
              </Button>
            </Space>
          </>
        ) : (
          <EmptyState
            title="Select a website"
            description="Choose a website to view and select products for video generation"
          />
        )}
      </Space>
    </Card>
  );
}
