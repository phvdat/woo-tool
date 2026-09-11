"use client";

import { Button, Card, Flex, Form, Input, Typography, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";

interface MusicUploaderProps {
  siteId: string | undefined;
  onRefresh: () => void;
}

export default function MusicUploader({ siteId, onRefresh }: MusicUploaderProps) {
  const backgroundMusicUrl = Form.useWatch("backgroundMusicUrl");
  const form = Form.useFormInstance();

  const handleUpload = async (file: File) => {
    if (!siteId) {
      message.warning("Save the website first before uploading music");
      return false;
    }

    try {
      const formData = new FormData();
      formData.append("websiteId", siteId);
      formData.append("file", file);

      const { data } = await axios.post(
        "/api/woo/website-config/upload-music",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      form.setFieldsValue({ backgroundMusicUrl: data.url });
      message.success("Music uploaded successfully");
      onRefresh();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Upload failed");
    }
    return false;
  };

  return (
    <Card title="Background Music">
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Upload an MP3 for video generation. Used automatically for all videos from this website.
      </Typography.Text>
      <Form.Item name="backgroundMusicUrl" hidden>
        <Input />
      </Form.Item>
      {backgroundMusicUrl && (
        <Flex align="center" gap={12} style={{ marginBottom: 12 }}>
          <audio controls src={backgroundMusicUrl} style={{ flex: 1, height: 36 }} />
        </Flex>
      )}
      <Upload
        accept="audio/mpeg,audio/mp3,.mp3"
        showUploadList={false}
        beforeUpload={handleUpload}
      >
        <Button icon={<UploadOutlined />}>
          {backgroundMusicUrl ? "Replace Music" : "Upload Music"}
        </Button>
      </Upload>
    </Card>
  );
}
