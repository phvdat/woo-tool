"use client";

import { endpoint } from "@/constant/endpoint";
import { SpyCompetitor } from "@/types/product-spy";
import { handleErrorMongoDB } from "@/helper/common";
import { detectPlatform } from "@/services/product-spy/detector";
import { Modal, Form, Input, InputNumber, Switch, message } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

interface CompetitorFormProps {
  open: boolean;
  editing: SpyCompetitor | null;
  onClose: () => void;
  onSuccess: () => void;
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
      } else {
        await axios.post(endpoint.spyCompetitors, values);
        messageApi.success("Competitor added");
      }

      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      const { errorMessage } = handleErrorMongoDB(err);
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={editing ? "Edit Competitor" : "Add Competitor"}
        open={open}
        onOk={handleSubmit}
        onCancel={onClose}
        confirmLoading={loading}
        okText={editing ? "Update" : "Add"}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ checkIntervalMinutes: 10, enabled: true }}
        >
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
