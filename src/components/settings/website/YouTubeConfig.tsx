"use client";

import { endpoint } from "@/constant/endpoint";
import { useYouTubeChannel } from "@/app/hooks/useYouTubeChannel";
import {
  Alert,
  Button,
  Card,
  Flex,
  Input,
  message,
  Popconfirm,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  DisconnectOutlined,
  PlusOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

interface YouTubeConfigProps {
  siteId: string | undefined;
  onRefresh: () => void;
}

interface ProjectForm {
  key: string;
  projectId?: string;
  clientId: string;
  clientSecret: string;
  configured: boolean;
  connected: boolean;
  channelTitle?: string;
  connectedByEmail?: string;
  quotaBlocked?: boolean;
  quotaResetAt?: string;
}

function draftForm(): ProjectForm {
  return {
    key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientId: "",
    clientSecret: "",
    configured: false,
    connected: false,
  };
}

export default function YouTubeConfig({ siteId, onRefresh }: YouTubeConfigProps) {
  const { channelStatus, refresh: refreshChannel } = useYouTubeChannel(siteId || null);
  const [messageApi, contextHolder] = message.useMessage();

  const [forms, setForms] = useState<ProjectForm[]>([]);
  const [syncedSignature, setSyncedSignature] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [disconnectingKey, setDisconnectingKey] = useState<string | null>(null);

  useEffect(() => {
    const incoming = channelStatus?.projects ?? [];
    // Signature covers every field the card renders, so a connection or a quota
    // change is reflected without a full page reload.
    const signature = JSON.stringify(
      incoming.map((project) => [
        project.projectId,
        project.configured ? 1 : 0,
        project.connected ? 1 : 0,
        project.channelTitle ?? "",
        project.connectedByEmail ?? "",
        project.quotaBlocked ? 1 : 0,
        project.quotaResetAt ?? "",
      ]),
    );
    if (signature === syncedSignature) return;
    setSyncedSignature(signature);
    setForms((prev) => {
      const drafts = prev.filter((form) => !form.projectId);
      const existing = incoming.map<ProjectForm>((project) => {
        // Keep whatever the user already typed for this project.
        const local = prev.find((form) => form.projectId === project.projectId);
        return {
          key: project.projectId,
          projectId: project.projectId,
          clientId: local?.clientId ?? project.clientId ?? "",
          clientSecret: local?.clientSecret ?? "",
          configured: !!project.configured,
          connected: !!project.connected,
          channelTitle: project.channelTitle,
          connectedByEmail: project.connectedByEmail,
          quotaBlocked: !!project.quotaBlocked,
          quotaResetAt: project.quotaResetAt as string | undefined,
        };
      });
      return [...existing, ...drafts];
    });
  }, [channelStatus, syncedSignature]);

  const updateForm = (key: string, patch: Partial<ProjectForm>) => {
    setForms((prev) => prev.map((form) => (form.key === key ? { ...form, ...patch } : form)));
  };

  const handleSaveCredentials = useCallback(
    async (form: ProjectForm): Promise<string | null> => {
      if (!siteId) {
        messageApi.warning("Save the website first before configuring YouTube");
        return null;
      }
      if (!form.clientId.trim()) {
        messageApi.warning("Client ID is required");
        return null;
      }
      if (!form.clientSecret.trim()) {
        messageApi.warning("Client Secret is required");
        return null;
      }

      setSavingKey(form.key);
      try {
        const { data } = await axios.put(endpoint.youtubeOauthConfig, {
          siteId,
          projectId: form.projectId,
          clientId: form.clientId.trim(),
          clientSecret: form.clientSecret.trim(),
        });
        const projectId: string = data.projectId;
        // The form keeps its own key: renaming it to the project id would
        // collide with the project that already uses that id.
        updateForm(form.key, {
          projectId,
          configured: true,
          clientSecret: "",
        });
        messageApi.success("OAuth credentials saved");
        refreshChannel();
        return projectId;
      } catch (error: any) {
        messageApi.error(error?.response?.data?.error || "Failed to save credentials");
        return null;
      } finally {
        setSavingKey(null);
      }
    },
    [siteId, messageApi, refreshChannel],
  );

  const handleConnect = useCallback(
    (projectKey: string, projectId?: string) => {
      if (!siteId) {
        messageApi.warning("Save the website first before connecting YouTube");
        return;
      }
      const query = projectId
        ? `?siteId=${siteId}&projectId=${encodeURIComponent(projectId)}`
        : `?siteId=${siteId}`;
      const popup = window.open(
        `${endpoint.youtubeConnect}${query}`,
        "youtube-connect",
        "width=600,height=700",
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
    },
    [siteId, messageApi, refreshChannel, onRefresh],
  );

  const handleSaveAndConnect = useCallback(
    async (form: ProjectForm) => {
      const projectId = await handleSaveCredentials(form);
      if (projectId) handleConnect(form.key, projectId);
    },
    [handleSaveCredentials, handleConnect],
  );

  const handleDisconnect = useCallback(
    async (form: ProjectForm) => {
      if (!siteId) return;
      if (!form.projectId) {
        setForms((prev) => prev.filter((item) => item.key !== form.key));
        return;
      }
      setDisconnectingKey(form.key);
      try {
        await axios.delete(
          `${endpoint.youtubeDisconnect}?siteId=${siteId}&projectId=${encodeURIComponent(form.projectId)}`,
        );
        messageApi.success("YouTube project disconnected");
        refreshChannel();
        onRefresh();
      } catch (error: any) {
        messageApi.error(error?.response?.data?.error || "Failed to disconnect");
      } finally {
        setDisconnectingKey(null);
      }
    },
    [siteId, messageApi, refreshChannel, onRefresh],
  );

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/youtube/callback`
      : "http://localhost:3000/api/youtube/callback";

  return (
    <Card
      title="YouTube Channels"
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setForms((prev) => [...prev, draftForm()])}>
          Add Project
        </Button>
      }
    >
      {contextHolder}
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Connect one or more YouTube API projects. When a project runs out of
        quota, publishing automatically fails over to the next one.
      </Typography.Text>

      {channelStatus?.blocked && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="YouTube publishing paused"
          description={`All projects are out of quota. Tasks resume automatically after the quota resets${
            channelStatus.blockedUntil
              ? ` (${new Date(channelStatus.blockedUntil).toLocaleString("vi-VN")})`
              : ""
          }.`}
        />
      )}

      {forms.length === 0 && (
        <Typography.Text type="secondary">
          No YouTube project configured yet.
        </Typography.Text>
      )}

      <Flex vertical gap={12} style={{ marginTop: forms.length ? 8 : 0 }}>
        {forms.map((form, index) => (
          <Card key={form.key} size="small">
            <Flex align="center" justify="space-between" gap={12} wrap>
              <Flex align="center" gap={8}>
                <YoutubeOutlined style={{ color: "#FF0000", fontSize: 18 }} />
                <div>
                  <strong>
                    {form.channelTitle || (form.projectId ? `Project ${index + 1}` : "New Project")}
                  </strong>
                  {form.connected && (
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Connected by {form.connectedByEmail || "unknown"}
                    </Typography.Text>
                  )}
                </div>
                {form.configured && !form.connected && <Tag color="blue">Credentials saved</Tag>}
                {form.connected && <Tag color="green">Connected</Tag>}
                {form.quotaBlocked && (
                  <Tag color="orange">
                    Quota exhausted
                    {form.quotaResetAt
                      ? ` until ${new Date(form.quotaResetAt).toLocaleString("vi-VN")}`
                      : ""}
                  </Tag>
                )}
              </Flex>

              <Flex gap={8}>
                {form.connected ? (
                  <>
                    <Button
                      size="small"
                      icon={<YoutubeOutlined />}
                      onClick={() => handleConnect(form.key, form.projectId)}
                    >
                      Reauthorize
                    </Button>
                    <Popconfirm
                      title="Disconnect this YouTube project?"
                      onConfirm={() => handleDisconnect(form)}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DisconnectOutlined />}
                        loading={disconnectingKey === form.key}
                      >
                        Disconnect
                      </Button>
                    </Popconfirm>
                  </>
                ) : (
                  <Popconfirm
                    title="Remove this project?"
                    onConfirm={() => handleDisconnect(form)}
                  >
                    <Button danger size="small" disabled={!form.projectId && forms.length <= 1}>
                      Remove
                    </Button>
                  </Popconfirm>
                )}
              </Flex>
            </Flex>

            <Flex vertical gap={8} style={{ marginTop: 12 }}>
              <Input
                placeholder="Client ID"
                value={form.clientId}
                onChange={(e) => updateForm(form.key, { clientId: e.target.value })}
              />
              <Input.Password
                placeholder={form.configured ? "Saved, leave blank to keep" : "Client Secret"}
                value={form.clientSecret}
                onChange={(e) => updateForm(form.key, { clientSecret: e.target.value })}
              />
              <Flex gap={8}>
                <Button
                  type="primary"
                  ghost
                  size="small"
                  loading={savingKey === form.key}
                  onClick={() => handleSaveCredentials(form)}
                  disabled={!siteId}
                >
                  {form.configured ? "Update Credentials" : "Save Credentials"}
                </Button>
                {!form.connected && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<YoutubeOutlined />}
                    onClick={() => handleSaveAndConnect(form)}
                    disabled={!siteId}
                  >
                    Save & Connect
                  </Button>
                )}
              </Flex>
            </Flex>
          </Card>
        ))}
      </Flex>

      <Flex align="center" gap={8} style={{ marginTop: 16 }}>
        <CheckCircleOutlined style={{ color: "#52c41a" }} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Authorized redirect URI:
        </Typography.Text>
      </Flex>
      <Typography.Text code copyable style={{ display: "block", marginTop: 4, fontSize: 11 }}>
        {redirectUri}
      </Typography.Text>
    </Card>
  );
}
