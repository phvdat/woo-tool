"use client";

import { useSpyTelegramConfig } from "@/app/hooks/useSpyTelegramConfig";
import { endpoint } from "@/constant/endpoint";
import { CheckCircleOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Input, Space, message } from "antd";
import axios from "axios";
import { useState } from "react";

export default function TelegramConfig() {
  const { config, mutate } = useSpyTelegramConfig();
  const [chatId, setChatId] = useState(config?.chatId || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSave = async () => {
    if (!chatId.trim()) {
      messageApi.error("Chat ID is required");
      return;
    }
    setSaving(true);
    try {
      await axios.post(endpoint.spyTelegramConfig, { chatId: chatId.trim() });
      await mutate();
      messageApi.success("Telegram config saved");
    } catch (err: any) {
      messageApi.error(err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await axios.post(endpoint.spyTestTelegram);
      messageApi.success("Test message sent");
    } catch (err: any) {
      messageApi.error(
        err?.response?.data?.error || "Failed to send test message"
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Card title="Telegram Notifications" size="small">
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <div
              style={{
                marginBottom: 4,
                fontSize: 13,
                color: "#666",
              }}
            >
              Bot Token is configured via environment variables. Enter the
              Chat ID or Group ID below:
            </div>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="Telegram Chat ID or Group ID"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                style={{ maxWidth: 400 }}
              />
              <Button
                type="primary"
                onClick={handleSave}
                loading={saving}
                icon={<CheckCircleOutlined />}
              >
                Save
              </Button>
              <Button
                onClick={handleTest}
                loading={testing}
                icon={<SendOutlined />}
                disabled={!chatId.trim()}
              >
                Test Telegram
              </Button>
            </Space.Compact>
          </div>
        </Space>
      </Card>
    </>
  );
}
