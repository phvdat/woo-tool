"use client";

import { Card, Form, Segmented } from "antd";

export default function AutoVideoConfig() {
  return (
    <Card title="Auto Video">
      <Form.Item
        name={["autoVideo", "enabled"]}
        label="Auto-generate videos after pipeline"
      >
        <Segmented
          options={[
            { label: "Off", value: false },
            { label: "On", value: true },
          ]}
        />
      </Form.Item>
    </Card>
  );
}
