"use client";

import { endpoint } from "@/constant/endpoint";
import { SpyCompetitor } from "@/types/product-spy";
import { handleErrorMongoDB } from "@/helper/common";
import { Modal, Form, Input, InputNumber, Switch, message } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

const { TextArea } = Input;

interface CompetitorFormProps {
  open: boolean;
  editing: SpyCompetitor | null;
  onClose: () => void;
  onSuccess: () => void;
}

function generateName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}

function parseUrls(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function validateUrls(urls: string[]): { valid: boolean; error?: string } {
  if (urls.length === 0) {
    return { valid: false, error: "Enter at least one URL" };
  }
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid: false, error: `Invalid URL: ${url} — only HTTP/HTTPS allowed` };
      }
    } catch {
      return { valid: false, error: `Invalid URL: ${url}` };
    }
  }
  const seen = new Set<string>();
  for (const url of urls) {
    const normalized = url.replace(/\/+$/, "");
    if (seen.has(normalized)) {
      return { valid: false, error: `Duplicate URL: ${url}` };
    }
    seen.add(normalized);
  }
  return { valid: true };
}

export default function CompetitorForm({
  open,
  editing,
  onClose,
  onSuccess,
}: CompetitorFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue(editing);
      } else {
        form.resetFields();
        form.setFieldsValue({ checkIntervalMinutes: 10, enabled: true });
      }
    }
  }, [open, editing, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editing?._id) {
        await axios.put(endpoint.spyCompetitors, {
          _id: editing._id,
          ...values,
        });
        messageApi.success("Competitor updated");
        onSuccess();
      } else {
        const urls = parseUrls(values.urls);
        const { valid, error } = validateUrls(urls);
        if (!valid) {
          messageApi.error(error);
          setLoading(false);
          return;
        }

        let created = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const url of urls) {
          try {
            const name = generateName(url);
            await axios.post(endpoint.spyCompetitors, {
              name,
              url,
              checkIntervalMinutes: values.checkIntervalMinutes,
              enabled: values.enabled,
            });
            created++;
          } catch (err: any) {
            failed++;
            const { errorMessage } = handleErrorMongoDB(err);
            errors.push(`${url}: ${errorMessage}`);
          }
        }

        if (failed === 0) {
          messageApi.success(`${created} competitor(s) added`);
          onSuccess();
        } else if (created === 0) {
          messageApi.error(`Failed: ${errors[0]}`);
        } else {
          messageApi.warning(`${created} added, ${failed} failed: ${errors[0]}`);
          onSuccess();
        }
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      const { errorMessage } = handleErrorMongoDB(err);
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!editing;

  return (
    <>
      {contextHolder}
      <Modal
        title={isEditing ? "Edit Competitor" : "Add Competitor"}
        open={open}
        onOk={handleSubmit}
        onCancel={onClose}
        confirmLoading={loading}
        okText={isEditing ? "Update" : "Add"}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ checkIntervalMinutes: 10, enabled: true }}
        >
          {isEditing ? (
            <>
              <Form.Item
                name="name"
                label="Competitor Name"
                rules={[{ required: true, message: "Enter a name" }]}
              >
                <Input placeholder="e.g. Competitor Store" />
              </Form.Item>

              <Form.Item
                name="url"
                label="Store URL"
                rules={[
                  { required: true, message: "Enter the store URL" },
                  { type: "url", message: "Enter a valid URL" },
                ]}
              >
                <Input placeholder="https://example.com" />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="urls"
              label="Stores URL"
              rules={[{ required: true, message: "Enter at least one store URL" }]}
            >
              <TextArea
                rows={5}
                placeholder={"https://example-store.com\nhttps://another-store.com\nhttps://shop.example.com"}
              />
            </Form.Item>
          )}

          <Form.Item
            name="checkIntervalMinutes"
            label="Check Interval (minutes)"
            rules={[{ required: true, message: "Set check interval" }]}
          >
            <InputNumber min={1} max={1440} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="Enabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
