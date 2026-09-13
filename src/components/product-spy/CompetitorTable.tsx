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
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import axios from "axios";
import { useState } from "react";
import CompetitorForm from "./CompetitorForm";

const { Text } = Typography;

export default function CompetitorTable() {
  const { competitors, isLoading, mutate } = useSpyCompetitors();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SpyCompetitor | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

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
          generic: "blue",
        };
        const labelMap: Record<string, string> = {
          woocommerce: "WooCommerce",
          shopify: "Shopify",
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
              icon={checking === record._id ? <LoadingOutlined /> : <ThunderboltOutlined />}
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
            {enabledCount > 0 && (
              <Tag color="green">{enabledCount} active</Tag>
            )}
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Competitor
            </Button>
          </Space>
        }
        size="small"
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={competitors}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: "No competitors yet. Add one to start monitoring." }}
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
