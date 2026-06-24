"use client";

import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import { useUser } from "@/app/hooks/useUser";
import Container from "@/components/commons/Container";
import { endpoint } from "@/constant/endpoint";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Select, Spin } from "antd";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

export interface FormatImageValues {
  name: string;
  images: string;
  website: string;
}

const FormatImage = () => {
  const { data } = useSession();
  const [form] = Form.useForm();
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite(
    data?.user?.email || "",
  );
  const { user } = useUser(data?.user?.email || "");
  const [linkDownload, setLinkDownload] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const websiteOptions = useMemo(() => {
    if (!websiteConfigList) return [];
    return websiteConfigList.map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [websiteConfigList]);

  const handlePasteName = () => {
    navigator.clipboard.readText().then((text) => {
      const name = text.replace(/\n/g, "").trim();
      form.setFieldValue("name", name);
    });
  };

  const handlePasteImages = () => {
    navigator.clipboard.readText().then((text) => {
      const currentImages = form.getFieldValue("images") || "";
      const newItems = text
        .split(/,|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const currentItems = currentImages
        ? currentImages
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
      form.setFieldValue("images", [...currentItems, ...newItems].join("\n"));
    });
  };

  const handleSubmit = async (values: FormatImageValues) => {
    setLoading(true);
    setLinkDownload("");
    const websiteObject = websiteConfigList?.find(
      (item) => item._id === values.website,
    );
    if (websiteObject && user) {
      try {
        const formData = new FormData();
        formData.append("websiteObject", JSON.stringify(websiteObject));
        formData.append("telegramId", user.telegramId);
        formData.append("name", values.name);
        formData.append("images", values.images);
        const res = await fetch(endpoint.formatImage, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setLinkDownload(data.link);
      } catch (error: any) {
        console.log("error-woo", error);
      }
    }
    setLoading(false);
  };

  return (
    <Container title="Format Image">
      <Card>
        <Form
          name="format-image-form"
          onFinish={handleSubmit}
          layout="vertical"
          form={form}
        >
          {websiteLoading && (
            <Spin
              size="large"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                zIndex: 100,
                transform: "translateX(-50%)",
              }}
            />
          )}

          <Form.Item<FormatImageValues>
            name="website"
            label="Website"
            rules={[
              {
                required: true,
                message: "Please select for website!",
              },
            ]}
          >
            <Select
              placeholder="Select Website"
              options={websiteOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item<FormatImageValues>
            label={
              <>
                Name &nbsp;
                <Button
                  type="default"
                  icon={<CopyOutlined />}
                  onClick={() => handlePasteName()}
                  style={{ backgroundColor: "#007BFF" }}
                >
                  Paste
                </Button>
              </>
            }
            name="name"
            rules={[{ required: true, message: "Please input product name" }]}
          >
            <Input allowClear />
          </Form.Item>

          <Form.Item<FormatImageValues>
            label={
              <>
                Images &nbsp;
                <Button
                  type="default"
                  icon={<CopyOutlined />}
                  onClick={() => handlePasteImages()}
                  style={{ backgroundColor: "#FFC107" }}
                >
                  Paste Multiple
                </Button>
              </>
            }
            name="images"
            rules={[{ required: true, message: "Please input product images" }]}
          >
            <Input.TextArea rows={4} allowClear />
          </Form.Item>

          <Form.Item>
            <Button htmlType="submit" block type="primary" loading={loading}>
              Submit
            </Button>
          </Form.Item>
        </Form>
        {linkDownload && (
          <Button htmlType="button" block>
            <a href={linkDownload} target="_blank" rel="noopener noreferrer">
              <DownloadOutlined /> Download
            </a>
          </Button>
        )}
      </Card>
    </Container>
  );
};

export default FormatImage;
