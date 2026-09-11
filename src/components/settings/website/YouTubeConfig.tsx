"use client";

import { endpoint } from "@/constant/endpoint";
import { useYouTubeChannel } from "@/app/hooks/useYouTubeChannel";
import { Button, Card, Flex, Input, message, Popconfirm, Typography } from "antd";
import { CheckCircleOutlined, DisconnectOutlined, YoutubeOutlined } from "@ant-design/icons";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

interface YouTubeConfigProps {
  siteId: string | undefined;
  onRefresh: () => void;
}

export default function YouTubeConfig({ siteId, onRefresh }: YouTubeConfigProps) {
  const { channelStatus, refresh: refreshChannel } = useYouTubeChannel(siteId || null);
  const [messageApi, contextHolder] = message.useMessage();

  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthSaving, setOauthSaving] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [loadingOauth, setLoadingOauth] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    setLoadingOauth(true);
    axios
      .get(`${endpoint.youtubeOauthConfig}?siteId=${siteId}`)
      .then(({ data }) => {
        setOauthConfigured(data.configured);
        if (data.clientId) setOauthClientId(data.clientId);
      })
      .catch(() => {})
      .finally(() => setLoadingOauth(false));
  }, [siteId]);

  const handleSaveOauth = async () => {
    if (!siteId) return;
    if (!oauthClientId.trim()) {
      messageApi.warning("Client ID is required");
      return;
    }
    if (!oauthClientSecret.trim()) {
      messageApi.warning("Client Secret is required");
      return;
    }
    setOauthSaving(true);
    try {
      await axios.put(endpoint.youtubeOauthConfig, {
        siteId,
        clientId: oauthClientId.trim(),
        clientSecret: oauthClientSecret.trim(),
      });
      setOauthConfigured(true);
      setOauthClientSecret("");
      messageApi.success("OAuth credentials saved");
    } catch (error: any) {
      messageApi.error(error?.response?.data?.error || "Failed to save credentials");
    } finally {
      setOauthSaving(false);
    }
  };

  const handleConnect = useCallback(() => {
    if (!siteId) {
      messageApi.warning("Save the website first before connecting YouTube");
      return;
    }
    const popup = window.open(
      `${endpoint.youtubeConnect}?siteId=${siteId}`,
      "youtube-connect",
      "width=600,height=700"
    );

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "youtube-connected") {
        messageApi.success(`Connected: ${event.data.channelTitle}`);
        refreshChannel();
        onRefresh();
      } else if (event.data?.type === "youtube-error") {
        messageApi.error(event.data.error || "Failed to connect");
      }
      window.removeEventListener("message", handler);
    };
    window.addEventListener("message", handler);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handler);
        refreshChannel();
      }
    }, 500);
  }, [siteId, messageApi, refreshChannel, onRefresh]);

  const handleDisconnect = useCallback(async () => {
    if (!siteId) return;
    setDisconnecting(true);
    try {
      await axios.delete(`${endpoint.youtubeDisconnect}?siteId=${siteId}`);
      messageApi.success("YouTube channel disconnected");
      refreshChannel();
      onRefresh();
    } catch (error: any) {
      messageApi.error(error?.response?.data?.error || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }, [siteId, messageApi, refreshChannel, onRefresh]);

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/youtube/callback`
    : "http://localhost:3000/api/youtube/callback";

  return (
    <Card title="YouTube Channel">
      {contextHolder}
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Connect a YouTube channel to auto-publish rendered videos.
      </Typography.Text>

      {channelStatus?.connected ? (
        <Flex align="center" justify="space-between" gap={12}>
          <Flex align="center" gap={8}>
            <YoutubeOutlined style={{ color: "#FF0000", fontSize: 18 }} />
            <div>
              <strong>{channelStatus.channelTitle}</strong>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                Connected by {channelStatus.connectedByEmail}
              </Typography.Text>
            </div>
          </Flex>
          <Popconfirm
            title="Disconnect this YouTube channel?"
            onConfirm={handleDisconnect}
          >
            <Button danger size="small" icon={<DisconnectOutlined />} loading={disconnecting}>
              Disconnect
            </Button>
          </Popconfirm>
        </Flex>
      ) : (
        <>
          <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
            <Typography.Text strong>Step 1: OAuth Credentials</Typography.Text>
            {oauthConfigured && <CheckCircleOutlined style={{ color: "#52c41a" }} />}
          </Flex>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
            Set the Authorized redirect URI to:
          </Typography.Text>
          <Typography.Text code copyable style={{ display: "block", marginBottom: 12, fontSize: 11 }}>
            {redirectUri}
          </Typography.Text>
          <Flex vertical gap={8}>
            <Input
              placeholder="Client ID"
              value={oauthClientId}
              onChange={(e) => setOauthClientId(e.target.value)}
              disabled={loadingOauth}
            />
            <Input.Password
              placeholder={oauthConfigured ? "Saved, leave blank to keep" : "Client Secret"}
              value={oauthClientSecret}
              onChange={(e) => setOauthClientSecret(e.target.value)}
              disabled={loadingOauth}
            />
            <Button
              type="primary"
              ghost
              size="small"
              loading={oauthSaving}
              onClick={handleSaveOauth}
              disabled={!siteId}
            >
              {oauthConfigured ? "Update Credentials" : "Save Credentials"}
            </Button>
          </Flex>

          {oauthConfigured && (
            <>
              <Flex align="center" gap={8} style={{ marginTop: 16, marginBottom: 8 }}>
                <Typography.Text strong>Step 2: Connect Channel</Typography.Text>
              </Flex>
              <Button type="primary" icon={<YoutubeOutlined />} onClick={handleConnect}>
                Connect YouTube Channel
              </Button>
            </>
          )}
        </>
      )}
    </Card>
  );
}
