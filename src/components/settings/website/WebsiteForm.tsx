"use client";

import { CanvasPosition, WebsiteConfig } from "@/types/woo";
import { Card, Col, Form, Input, InputNumber, Row, Select, Segmented } from "antd";

interface WebsiteFormProps {
  form: any;
}

export default function WebsiteForm({ form }: WebsiteFormProps) {
  return (
    <Card title="Website Settings">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="shopName"
            label="Shop Name"
            rules={[{ required: true, message: "Please input Shop Name" }]}
          >
            <Input placeholder="Shop Name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="quality"
            label="Quality"
            rules={[{ required: true, message: "Please input Quality" }]}
          >
            <Input type="number" placeholder="Quality" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="logoUrl"
            label="Watermark URL"
            rules={[{ required: true, message: "Please input Logo URL" }]}
          >
            <Input placeholder="Logo URL" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="logoPosition" label="Position">
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
          <Form.Item
            name="logoWidth"
            label="Logo Width"
            rules={[{ required: true, message: "Please input Logo Width" }]}
          >
            <Input type="number" placeholder="Logo Width" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="logoHeight"
            label="Logo Height"
            rules={[{ required: true, message: "Please input Logo Height" }]}
          >
            <Input type="number" placeholder="Logo Height" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="imageWidth"
            label="Image Width"
            rules={[{ required: true, message: "Please input Image Width" }]}
          >
            <Input type="number" placeholder="Image Width" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="imageHeight"
            label="Image Height"
            rules={[{ required: true, message: "Please input Image Height" }]}
          >
            <Input type="number" placeholder="Image Height" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
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
      <Form.Item
        name="url"
        label="URL"
        rules={[{ required: true, message: "Please input URL" }]}
      >
        <Input placeholder="https://example.com" />
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
  );
}
