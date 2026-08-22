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
  message,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";

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
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
