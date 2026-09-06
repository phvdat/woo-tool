"use client";

import { endpoint } from "@/constant/endpoint";
import { handleErrorMongoDB } from "@/helper/common";
import { CanvasPosition, WebsiteConfig } from "@/types/woo";
import { Alert, Button, Col, Flex, Form, Modal, Row, message } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";
import WebsiteForm from "./website/WebsiteForm";
import ProductConfigForm from "./website/ProductConfigForm";
import BlogConfigForm from "./website/BlogConfigForm";
import AutoVideoConfig from "./website/AutoVideoConfig";
import MusicUploader from "./website/MusicUploader";
import YouTubeConfig from "./website/YouTubeConfig";
import YouTubeDescriptionTemplate from "./website/YouTubeDescriptionTemplate";

interface WebsiteFormValue extends WebsiteConfig {}

interface UpdateWebsiteListModalProps {
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
  autoVideo: {
    enabled: false,
  },
};

const UpdateWebsiteListModal = ({
  initialForm = defaultFormValue,
  _id,
  refresh,
}: UpdateWebsiteListModalProps) => {
  const { data } = useSession();
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<WebsiteFormValue>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createWebsite = async (values: WebsiteFormValue) => {
    try {
      await axios.post(endpoint.websiteConfigList, {
        ...values,
        owner: data?.user?.email,
        members: values.members?.map((e) => e.toLowerCase()) || [],
      });
      messageApi.success("Website created successfully");
      refresh?.();
      setIsModalOpen(false);
    } catch (err) {
      const { errorMessage } = handleErrorMongoDB(err);
      setError(errorMessage);
    }
  };

  const updateWebsite = async (id: string, values: WebsiteFormValue) => {
    try {
      await axios.put(endpoint.websiteConfigList, {
        _id: id,
        ...values,
        members: values.members?.map((e) => e.toLowerCase()) || [],
      });
      messageApi.success("Website updated successfully");
      refresh();
      setIsModalOpen(false);
    } catch (err) {
      const { errorMessage } = handleErrorMongoDB(err);
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
        {_id ? "Edit" : "Add New Website"}
      </Button>
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        maskClosable={false}
        width="100%"
        style={{ maxWidth: 1000 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          name="website-form"
          disabled={loading}
          initialValues={initialForm}
        >
          <Row gutter={16}>
            <Col md={{ span: 12 }} xs={{ span: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <WebsiteForm form={form} />
                <ProductConfigForm />
              </div>
            </Col>
            <Col md={{ span: 12 }} xs={{ span: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <BlogConfigForm />
                <AutoVideoConfig />
                <MusicUploader siteId={_id} onRefresh={refresh} />
                <YouTubeConfig siteId={_id} onRefresh={refresh} />
                <YouTubeDescriptionTemplate />
              </div>
            </Col>
          </Row>

          <Flex justify="center" style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              {_id ? "Update Website" : "Create Website"}
            </Button>
          </Flex>

          {error && <Alert message={error} type="error" style={{ marginTop: 16 }} />}
        </Form>
      </Modal>
    </>
  );
};

export default UpdateWebsiteListModal;
