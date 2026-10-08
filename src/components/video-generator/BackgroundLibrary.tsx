"use client";

import { endpoint } from "@/constant/endpoint";
import { BackgroundImage } from "@/types/video";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Image, message, Space, Tag, Typography, Upload } from "antd";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

const { Text } = Typography;

export default function BackgroundLibrary() {
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBackgrounds = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(endpoint.videoBackgrounds);
      setBackgrounds(data.backgroundImages || []);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to fetch background images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackgrounds();
  }, [fetchBackgrounds]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(endpoint.videoBackgrounds, formData);
      message.success("Background image uploaded successfully");
      fetchBackgrounds();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to upload background image");
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDelete = async (backgroundId: string) => {
    try {
      await axios.delete(`${endpoint.videoBackgrounds}/${backgroundId}`);
      message.success("Background image deleted");
      fetchBackgrounds();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to delete background image");
    }
  };

  return (
    <Card
      title={
        <Space>
          <span>Background Library</span>
          <Tag>{backgrounds.length}</Tag>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Upload
          accept="image/jpeg,image/png,image/webp"
          showUploadList={false}
          beforeUpload={(file) => {
            handleUpload(file as unknown as File);
            return false;
          }}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            Upload Background
          </Button>
        </Upload>

        {backgrounds.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No background images uploaded"
          />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {backgrounds.map((background) => (
              <div key={background._id} style={{ width: 96, textAlign: "center" }}>
                <Image
                  src={background.url}
                  width={96}
                  height={96}
                  alt={background.originalName}
                  style={{ objectFit: "cover", borderRadius: 6 }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(background._id!)}
                  style={{ marginTop: 4 }}
                />
              </div>
            ))}
          </div>
        )}

        <Text type="secondary">
          One random background is selected per video and used behind the product
          in every scene. Leave this empty to keep the default product background.
        </Text>
      </Space>
    </Card>
  );
}
