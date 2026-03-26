"use client";

import { SettingFilled } from "@ant-design/icons";
import { Button, Form, Input, message, Modal } from "antd";
import { useState } from "react";
import { useGlobalCateKeywordConfig } from "@/app/hooks/useGlobalCateKeywordConfig";

interface CateKeywordConfigProps {
  categoriesOptions: string[];
}

const CateKeywordConfig = ({ categoriesOptions }: CateKeywordConfigProps) => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { cateKeyword, save } = useGlobalCateKeywordConfig();
  const handleSubmit = async (values: Record<string, string>) => {
    const data = Object.entries(values).reduce(
      (acc, [key, value]) => {
        if (!value) return acc;

        return {
          ...acc,
          [key]: value
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean),
        };
      },
      {} as Record<string, string[]>,
    );
    await save(data);
    message.success("Saved!");
  };

  return (
    <div style={{ display: "inline" }}>
      <SettingFilled onClick={() => setIsModalOpen(true)} />
      <Modal
        width="100%"
        style={{ top: 20 }}
        title="Cate Keyword Config (Global)"
        open={isModalOpen}
        footer={null}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={Object.entries(cateKeyword).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: (value as string[]).join(","),
            }),

            {} as Record<string, string>,
          )}
        >
          {categoriesOptions.map((category) => (
            <Form.Item
              key={category}
              name={category}
              label={category.split(">").pop()}
            >
              <Input allowClear />
            </Form.Item>
          ))}

          <Button htmlType="submit" type="primary" block>
            Save
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default CateKeywordConfig;
