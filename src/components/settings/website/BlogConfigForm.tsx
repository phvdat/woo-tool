"use client";

import { Card, Col, Form, Input, InputNumber, Row, Select, Segmented } from "antd";

export default function BlogConfigForm() {
  return (
    <Card title="Auto Blog">
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name={["autoBlog", "enabled"]} label="Enable Auto Blog">
            <Segmented
              options={[
                { label: "Off", value: false },
                { label: "On", value: true },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name={["autoBlog", "status"]} label="Publish Status">
            <Select
              options={[
                { label: "Draft", value: "draft" },
                { label: "Publish", value: "publish" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name={["autoBlog", "postsPerRun"]} label="Posts Per Run">
            <Input type="number" placeholder="1" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name={["autoBlog", "cron"]} label="Cron Schedule">
        <Input placeholder="0 19,21,23,1,3,5 * * *" />
      </Form.Item>
    </Card>
  );
}
