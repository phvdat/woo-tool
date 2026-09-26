"use client";

import { Card, Col, Form, Input, InputNumber, Row, Select, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";

export default function ProductConfigForm() {
  return (
    <Card title="Product Settings">
      <Form.Item
        name={["product", "aiProvider"]}
        label="AI Provider"
        initialValue="gemini"
      >
        <Select
          options={[
            { label: "Gemini", value: "gemini" },
            { label: "ChatGPT", value: "chatgpt" },
          ]}
          placeholder="Select AI Provider"
        />
      </Form.Item>
      <label style={{ fontWeight: 500 }}>Schedule Published</label>
      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Form.Item name={["product", "publicTime"]}>
            <Input type="text" placeholder="Start" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name={["product", "gapFrom"]}
            rules={[{ required: true, message: "Required" }]}
          >
            <InputNumber min={0} placeholder="From" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name={["product", "gapTo"]}
            rules={[{ required: true, message: "Required" }]}
          >
            <InputNumber min={0} placeholder="To" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
        YouTube: videos publish at the same time as the product. If the product publishes
        immediately, the video publishes immediately too.
      </Typography.Paragraph>
      <Form.Item
        name={["product", "promptDescriptionProduct"]}
        label="Prompt Description Product"
        rules={[{ required: true, message: "Required" }]}
      >
        <TextArea rows={4} placeholder="Write a story about {product-name} with 100 words" />
      </Form.Item>
      <Form.Item
        name={["product", "promptTagsProduct"]}
        label="Prompt Tags Product"
        rules={[{ required: true, message: "Required" }]}
      >
        <TextArea rows={4} />
      </Form.Item>
    </Card>
  );
}
