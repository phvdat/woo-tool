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
      <Form.Item
        name={["autoVideo", "useBackgroundImage"]}
        label="Use Background Image"
        initialValue={false}
        tooltip="On: use a random image from the Background Library. Off: use the blurred product image."
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
