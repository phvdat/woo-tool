"use client";

import { useSpyCompetitors } from "@/app/hooks/useSpyCompetitors";
import { endpoint } from "@/constant/endpoint";
import { SpyCompetitor } from "@/types/product-spy";
import { handleErrorMongoDB } from "@/helper/common";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import axios from "axios";
import { useMemo, useState } from "react";
import CompetitorForm from "./CompetitorForm";

const { Text } = Typography;

export default function CompetitorTable() {
  const { competitors, isLoading, mutate } = useSpyCompetitors();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SpyCompetitor | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [reDetecting, setReDetecting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredCompetitors = useMemo(() => {
    if (!competitors) return [];
    return competitors.filter((c) => {
      if (platformFilter && c.platform !== platformFilter) return false;
      if (statusFilter) {
        if (statusFilter === "none" && c.lastStatus) return false;
        if (statusFilter === "success" && c.lastStatus !== "success") return false;
        if (statusFilter === "error" && c.lastStatus !== "error") return false;
      }
      return true;
    });
  }, [competitors, platformFilter, statusFilter]);

  const handleDelete = async (_id: string) => {
    Modal.confirm({
      title: "Delete Competitor",
      content: "Are you sure you want to delete this competitor?",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await axios.delete(endpoint.spyCompetitors, {
            params: { _id },
          });
          messageApi.success("Competitor deleted");
          await mutate();
        } catch (err: any) {
          const { errorMessage } = handleErrorMongoDB(err);
          messageApi.error(errorMessage);
        }
      },
    });
  };

  const handleToggle = async (_id: string, enabled: boolean) => {
    try {
      await axios.put(endpoint.spyCompetitors, { _id, enabled });
      await mutate();
    } catch (err: any) {
      messageApi.error("Failed to toggle competitor");
    }
  };

  const handleCheckNow = async (_id: string) => {
    setChecking(_id);
    try {
      await axios.post(endpoint.spyCheckNow, { competitorId: _id });
      messageApi.success("Check started");
    } catch (err: any) {
      messageApi.error(err?.response?.data?.error || "Failed to start check");
    } finally {
      setChecking(null);
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      await axios.post(endpoint.spyCheckNow);
      messageApi.success("Checking all enabled competitors");
    } catch (err: any) {
      messageApi.error(err?.response?.data?.error || "Failed to start check");
    } finally {
      setCheckingAll(false);
    }
  };

  const handleRedetectAll = async () => {
    setReDetecting(true);
    try {
      const { data } = await axios.patch(endpoint.spyCompetitors);
      messageApi.success(`Re-detected ${data.updated} platform(s)`);
      await mutate();
    } catch (err: any) {
      messageApi.error(err?.response?.data?.error || "Failed to re-detect platforms");
    } finally {
      setReDetecting(false);
    }
  };

  const handleEdit = (record: SpyCompetitor) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: SpyCompetitor) => (
        <Text strong>{name}</Text>
      ),
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      ),
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      width: 120,
      render: (platform: string) => {
        const colorMap: Record<string, string> = {
          woocommerce: "green",
          shopify: "purple",
          shopbase: "cyan",
          teechip: "orange",
          merchize: "magenta",
          merchking: "gold",
          lattex: "lime",
          generic: "blue",
        };
        const labelMap: Record<string, string> = {
          woocommerce: "WooCommerce",
          shopify: "Shopify",
          shopbase: "ShopBase",
          teechip: "TeeChip",
          merchize: "Merchize",
          merchking: "MerchKing",
          lattex: "Lattex",
          generic: "Generic",
        };
        return (
          <Tag color={colorMap[platform] || "blue"}>
            {labelMap[platform] || platform}
          </Tag>
        );
      },
    },
    {
      title: "Interval",
      dataIndex: "checkIntervalMinutes",
      key: "checkIntervalMinutes",
      width: 90,
      render: (min: number) => `${min}m`,
    },
    {
      title: "Status",
      dataIndex: "lastStatus",
      key: "lastStatus",
      width: 90,
      render: (status: string) => {
        if (!status) return <Tag>-</Tag>;
        return (
          <Tag
            color={status === "success" ? "success" : "error"}
            icon={
              status === "success" ? (
                <CheckCircleOutlined />
              ) : (
                <ExclamationCircleOutlined />
              )
            }
          >
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Last Check",
      dataIndex: "lastCheckAt",
      key: "lastCheckAt",
      width: 160,
      render: (date: string) =>
        date
          ? new Date(date).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Never",
    },
    {
      title: "Enabled",
      dataIndex: "enabled",
      key: "enabled",
      width: 70,
      render: (enabled: boolean, record: SpyCompetitor) => (
        <Switch
          checked={enabled}
          size="small"
          onChange={(checked) => handleToggle(record._id!, checked)}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      render: (_: any, record: SpyCompetitor) => (
        <Space size={4}>
          <Tooltip title="Check Now">
            <Button
              type="text"
              size="small"
              icon={
                checking === record._id ? (
                  <LoadingOutlined />
                ) : (
                  <ThunderboltOutlined />
                )
              }
              onClick={() => handleCheckNow(record._id!)}
              disabled={checking !== null}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record._id!)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const enabledCount = competitors?.filter((c) => c.enabled).length || 0;

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <EyeOutlined />
            <span>Competitors</span>
            {enabledCount > 0 && <Tag color="green">{enabledCount} active</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleCheckAll}
              loading={checkingAll}
              disabled={enabledCount === 0}
            >
              Check All
            </Button>
            <Button
              icon={<SearchOutlined />}
              onClick={handleRedetectAll}
              loading={reDetecting}
            >
              Re-detect Platform
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Competitor
            </Button>
          </Space>
        }
        size="small"
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <Select
            placeholder="All Platforms"
            allowClear
            style={{ width: 150 }}
            value={platformFilter}
            onChange={setPlatformFilter}
            options={[
              { value: "woocommerce", label: "WooCommerce" },
              { value: "shopify", label: "Shopify" },
              { value: "shopbase", label: "ShopBase" },
              { value: "teechip", label: "TeeChip" },
              { value: "merchize", label: "Merchize" },
              { value: "merchking", label: "MerchKing" },
              { value: "lattex", label: "Lattex" },
              { value: "generic", label: "Generic" },
            ]}
          />
          <Select
            placeholder="All Statuses"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "success", label: "Success" },
              { value: "error", label: "Error" },
              { value: "none", label: "Not Checked" },
            ]}
          />
        </Space>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredCompetitors}
          loading={isLoading}
          pagination={{ pageSize: 25, showSizeChanger: false }}
          size="small"
          scroll={{ x: 900 }}
          locale={{
            emptyText: "No competitors yet. Add one to start monitoring.",
          }}
        />
      </Card>

      <CompetitorForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={() => {
          setFormOpen(false);
          setEditing(null);
          mutate();
        }}
      />
    </>
  );
}
