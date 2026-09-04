"use client";
import { endpoint } from "@/constant/endpoint";
import { handleErrorMongoDB } from "@/helper/common";
import { CanvasPosition, WebsiteConfig } from "@/types/woo";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Typography,
  Upload,
  message,
  Tag,
  Popconfirm,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import { UploadOutlined, DeleteOutlined, YoutubeOutlined, DisconnectOutlined, CheckCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import { useYouTubeChannel } from "@/app/hooks/useYouTubeChannel";

interface WebsiteFormValue extends WebsiteConfig {}

interface AddNewCategoryProps {
  initialForm?: WebsiteFormValue;
  _id?: string;
  refresh: () => void;
}

const defaultFormValue: WebsiteFormValue = {
  url: "",
  logoUrl: "",
  logoWidth: 2000,
  logoHeight: 2000,
  imageWidth: 2000,
  imageHeight: 2000,
  logoPosition: CanvasPosition.northwest,
  shopName: "",
  quality: 100,
  members: [],
  wpUsername: "",
  wpAppPassword: "",
  autoBlog: {
    enabled: false,
    status: "publish",
    cron: "0 19,21,23,1,3,5 * * *",
    postsPerRun: 1,
  },
  product: {
    promptDescriptionProduct: "",
    promptTagsProduct: "",
    publicTime: "",
    gapFrom: 0,
    gapTo: 0,
  },
};

const UpdateWebsiteListModal = ({
  initialForm = defaultFormValue,
  _id,
  refresh,
}: AddNewCategoryProps) => {
  const { data } = useSession();

  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<WebsiteFormValue>();
  const backgroundMusicUrl = Form.useWatch("backgroundMusicUrl", form);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [musicUploading, setMusicUploading] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);

  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthSaving, setOauthSaving] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [loadingOauth, setLoadingOauth] = useState(false);

  const { channelStatus, refresh: refreshChannel } = useYouTubeChannel(_id || null);

  useEffect(() => {
    if (!isModalOpen || !_id) return;
    setLoadingOauth(true);
    axios
      .get(`${endpoint.youtubeOauthConfig}?siteId=${_id}`)
      .then(({ data }) => {
        setOauthConfigured(data.configured);
        if (data.clientId) setOauthClientId(data.clientId);
      })
      .catch(() => {})
      .finally(() => setLoadingOauth(false));
  }, [isModalOpen, _id]);

  const handleSaveOauth = async () => {
    if (!_id) return;
    if (!oauthClientId.trim()) {
      messageApi.open({ type: "warning", content: "Client ID is required" });
      return;
    }
    if (!oauthClientSecret.trim()) {
      messageApi.open({ type: "warning", content: "Client Secret is required" });
      return;
    }
    setOauthSaving(true);
    try {
      await axios.put(endpoint.youtubeOauthConfig, {
        siteId: _id,
        clientId: oauthClientId.trim(),
        clientSecret: oauthClientSecret.trim(),
      });
      setOauthConfigured(true);
      setOauthClientSecret("");
      messageApi.open({ type: "success", content: "OAuth credentials saved" });
    } catch (error: any) {
      messageApi.open({
        type: "error",
        content: error?.response?.data?.error || "Failed to save credentials",
      });
    } finally {
      setOauthSaving(false);
    }
  };

  const handleYouTubeConnect = useCallback(() => {
    if (!_id) {
      messageApi.open({
        type: "warning",
        content: "Please save the website first before connecting YouTube.",
      });
      return;
    }
    const popup = window.open(
      `${endpoint.youtubeConnect}?siteId=${_id}`,
      "youtube-connect",
      "width=600,height=700"
    );

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "youtube-connected") {
        messageApi.open({
          type: "success",
          content: `Connected to YouTube channel: ${event.data.channelTitle}`,
        });
        refreshChannel();
        refresh();
      } else if (event.data?.type === "youtube-error") {
        messageApi.open({
          type: "error",
          content: event.data.error || "Failed to connect YouTube channel",
        });
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
  }, [_id, messageApi, refreshChannel, refresh]);

  const handleYouTubeDisconnect = useCallback(async () => {
    if (!_id) return;
    setDisconnecting(true);
    try {
      await axios.delete(`${endpoint.youtubeDisconnect}?siteId=${_id}`);
      messageApi.open({
        type: "success",
        content: "YouTube channel disconnected",
      });
      refreshChannel();
      refresh();
    } catch (error: any) {
      messageApi.open({
        type: "error",
        content: error?.response?.data?.error || "Failed to disconnect",
      });
    } finally {
      setDisconnecting(false);
    }
  }, [_id, messageApi, refreshChannel, refresh]);

  const handleMusicUpload = async (file: File) => {
    if (!_id) {
      messageApi.open({
        type: "warning",
        content: "Please save the website first before uploading music.",
      });
      return false;
    }

    setMusicUploading(true);
    try {
      const formData = new FormData();
      formData.append("websiteId", _id);
      formData.append("file", file);

      const { data } = await axios.post(
        "/api/woo/website-config/upload-music",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      form.setFieldsValue({ backgroundMusicUrl: data.url });
      messageApi.open({
        type: "success",
        content: "Music uploaded successfully!",
      });
      refresh();
    } catch (error: any) {
      const msg =
        error?.response?.data?.error || error?.message || "Upload failed";
      messageApi.open({ type: "error", content: msg });
    } finally {
      setMusicUploading(false);
    }
    return false;
  };

  const createWebsite = async (values: WebsiteFormValue) => {
    const payload = {
      ...values,
      owner: data?.user?.email,
      members: values.members?.map((e) => e.toLowerCase()) || [],
    };

    try {
      await axios.post(endpoint.websiteConfigList, payload);
      messageApi.open({
        type: "success",
        content: "Create category successfully!",
      });
      refresh && refresh();
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const updateWebsite = async (_id: string, values: WebsiteFormValue) => {
    try {
      await axios.put(endpoint.websiteConfigList, {
        _id,
        ...values,
        members: values.members?.map((e) => e.toLowerCase()) || [],
      });
      messageApi.open({
        type: "success",
        content: "Update category successfully!",
      });
      refresh();
      setIsModalOpen(false);
    } catch (error) {
      console.log("error", error);
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const onSubmit = async (values: WebsiteFormValue) => {
    setLoading(true);
    setError("");
    if (_id) {
      await updateWebsite(_id, values);
    } else {
      await createWebsite(values);
    }
    setLoading(false);
  };

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/youtube/callback`
    : "http://localhost:3000/api/youtube/callback";

  return (
    <>
      {contextHolder}
      <Button onClick={() => setIsModalOpen(true)}>
        {_id ? "Edit" : "Add new Website List"}
      </Button>
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        width={"100%"}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          name="add-category-form"
          disabled={loading}
          initialValues={initialForm}
        >
          <Row gutter={16}>
            <Col md={{ span: 12 }} xs={{ span: 24 }}>
              <Card title="Website Setting" style={{ marginTop: 24 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="shopName"
                      label="Shop Name"
                      rules={[
                        { required: true, message: "Please input Shop Name!" },
                      ]}
                    >
                      <Input type="text" placeholder="Shop Name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="quality"
                      label="Quality"
                      rules={[
                        { required: true, message: "Please input Quality!" },
                      ]}
                    >
                      <Input type="number" placeholder="Quality" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="logoUrl"
                      label="Watermark URL"
                      rules={[
                        { required: true, message: "Please input Logo URL!" },
                      ]}
                    >
                      <Input type="text" placeholder="Logo URL" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="logoPosition"
                      label="Position"
                    >
                      <Segmented
                        shape="round"
                        options={[
                          { value: CanvasPosition.northwest, label: "TL" },
                          { value: CanvasPosition.northeast, label: "TR" },
                          { value: CanvasPosition.southeast, label: "BR" },
                          { value: CanvasPosition.southwest, label: "BL" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="logoWidth"
                      label="Logo Width"
                      rules={[
                        { required: true, message: "Please input Logo Width!" },
                      ]}
                    >
                      <Input type="number" placeholder="Logo Width" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="logoHeight"
                      label="Logo Height"
                      rules={[
                        {
                          required: true,
                          message: "Please input Logo Height!",
                        },
                      ]}
                    >
                      <Input type="number" placeholder="Logo Height" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="imageWidth"
                      label="Image Width"
                      rules={[
                        {
                          required: true,
                          message: "Please input Image Width!",
                        },
                      ]}
                    >
                      <Input type="number" placeholder="Image Width" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item<WebsiteFormValue>
                      name="imageHeight"
                      label="Image Height"
                      rules={[
                        {
                          required: true,
                          message: "Please input Image Height!",
                        },
                      ]}
                    >
                      <Input type="number" placeholder="Image Height" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item<WebsiteFormValue>
                  name="members"
                  label="Members (emails)"
                  tooltip="Press enter after each email"
                >
                  <Select
                    mode="tags"
                    placeholder="Enter member email"
                    tokenSeparators={[",", " "]}
                  />
                </Form.Item>

                <Form.Item<WebsiteFormValue>
                  name="url"
                  label="URL"
                  rules={[{ required: true, message: "Please input URL!" }]}
                >
                  <Input type="text" placeholder="URL" />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="wpUsername" label="WP Username">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="wpAppPassword" label="WP App Password">
                      <Input.Password />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col md={{ span: 12 }} xs={{ span: 24 }}>
              <Card title="Product" style={{ marginTop: 24 }}>
                <label>Schedule Published</label>
                <Row gutter={[12, 12]}>
                  <Col span={8}>
                    <Form.Item name={["product", "publicTime"]} shouldUpdate>
                      <InputNumber
                        type="text"
                        placeholder="Start"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={["product", "gapFrom"]}
                      rules={[
                        { required: true, message: "Please input gap time!" },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="From"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={["product", "gapTo"]}
                      rules={[
                        { required: true, message: "Please input gap time!" },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="To"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name={["product", "promptDescriptionProduct"]}
                  label="Prompt Description Product"
                  rules={[
                    {
                      required: true,
                      message: "Please input Prompt Description Product!",
                    },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Ex: Write a story about {product-name} with 100 words"
                  />
                </Form.Item>

                <Form.Item
                  name={["product", "promptTagsProduct"]}
                  label="Prompt Tags Product"
                  rules={[
                    {
                      required: true,
                      message: "Please input Prompt Tags Product!",
                    },
                  ]}
                >
                  <TextArea rows={4} />
                </Form.Item>
              </Card>
              <Card title="Auto Blog" style={{ marginTop: 24 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name={["autoBlog", "enabled"]}
                      label="Enable Auto Blog"
                    >
                      <Segmented
                        options={[
                          { label: "Off", value: false },
                          { label: "On", value: true },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={["autoBlog", "status"]}
                      label="Publish Status"
                    >
                      <Select
                        options={[
                          {
                            label: "Draft",
                            value: "draft",
                          },
                          {
                            label: "Publish",
                            value: "publish",
                          },
                        ]}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      name={["autoBlog", "postsPerRun"]}
                      label="Posts Per Run"
                    >
                      <Input type="number" placeholder="Posts Per Run" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name={["autoBlog", "cron"]} label="Cron Schedule">
                  <Input placeholder="0 19,21,23,1,3,5 * * *" />
                </Form.Item>
              </Card>
              <Card title="Background Music" style={{ marginTop: 24 }}>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                  Upload an MP3 for video generation. This music will be used automatically for all videos from this website.
                </Typography.Text>
                <Form.Item<WebsiteFormValue> name="backgroundMusicUrl" hidden>
                  <Input />
                </Form.Item>
                {backgroundMusicUrl ? (
                  <Flex align="center" gap={12} style={{ marginBottom: 12 }}>
                    <audio
                      controls
                      src={backgroundMusicUrl}
                      style={{ flex: 1, height: 36 }}
                    />
                  </Flex>
                ) : null}
                <Upload
                  accept="audio/mpeg,audio/mp3,.mp3"
                  showUploadList={false}
                  beforeUpload={handleMusicUpload}
                  disabled={musicUploading}
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={musicUploading}
                  >
                    {backgroundMusicUrl
                      ? "Replace Music"
                      : "Upload Music"}
                  </Button>
                </Upload>
              </Card>
              <Card title="YouTube Channel" style={{ marginTop: 24 }}>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                  Connect a YouTube channel to auto-publish rendered videos.
                </Typography.Text>

                {channelStatus?.connected ? (
                  <Flex align="center" justify="space-between" gap={12}>
                    <Flex align="center" gap={8}>
                      <YoutubeOutlined style={{ color: "#FF0000", fontSize: 18 }} />
                      <div>
                        <div>
                          <strong>{channelStatus.channelTitle}</strong>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Connected by {channelStatus.connectedByEmail}
                        </Typography.Text>
                      </div>
                    </Flex>
                    <Popconfirm
                      title="Disconnect this YouTube channel?"
                      onConfirm={handleYouTubeDisconnect}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DisconnectOutlined />}
                        loading={disconnecting}
                      >
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
                    <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
                      Create an OAuth 2.0 Client ID (Web application) in Google Cloud Console for this website&apos;s channel. Set the Authorized redirect URI to:
                    </Typography.Text>
                    <Typography.Text
                      code
                      copyable
                      style={{ display: "block", marginBottom: 12, fontSize: 11 }}
                    >
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
                        placeholder={oauthConfigured ? "•••••••• (saved, leave blank to keep)" : "Client Secret"}
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
                        disabled={!_id}
                      >
                        {oauthConfigured ? "Update Credentials" : "Save Credentials"}
                      </Button>
                    </Flex>

                    {oauthConfigured && (
                      <>
                        <Flex align="center" gap={8} style={{ marginTop: 16, marginBottom: 8 }}>
                          <Typography.Text strong>Step 2: Connect Channel</Typography.Text>
                        </Flex>
                        <Button
                          type="primary"
                          icon={<YoutubeOutlined />}
                          onClick={handleYouTubeConnect}
                        >
                          Connect YouTube Channel
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Card>
              <Card title="YouTube Description Template" style={{ marginTop: 24 }}>
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                  Custom template for YouTube video descriptions. Leave empty to use the default format.
                </Typography.Text>
                <Form.Item<WebsiteFormValue> name="youtubeDescriptionTemplate">
                  <TextArea
                    rows={6}
                    placeholder={`Shop now: {productUrl}\n\n{productName}\n\n{shortDescription}\n\nDiscover more at {shopName}: {siteUrl}\n\n{tagsHashtags}`}
                  />
                </Form.Item>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                  Available placeholders:
                </Typography.Text>
                <Flex wrap="wrap" gap={4} style={{ marginTop: 4 }}>
                  {['{productName}', '{shortDescription}', '{productUrl}', '{shopName}', '{siteUrl}', '{tags}', '{tagsHashtags}'].map((p) => (
                    <Tag key={p} style={{ fontSize: 11 }}>{p}</Tag>
                  ))}
                </Flex>
              </Card>
            </Col>
          </Row>
          <Flex justify="center" gap={16} style={{ marginTop: 24 }}>
            <Button htmlType="submit" loading={loading}>
              Submit
            </Button>
          </Flex>
          {error ? (
            <Alert message={error} type="error" style={{ marginTop: 24 }} />
          ) : null}
        </Form>
      </Modal>
    </>
  );
};

export default UpdateWebsiteListModal;
