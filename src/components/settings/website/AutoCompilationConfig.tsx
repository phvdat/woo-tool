"use client";

import { Card, Form, InputNumber, Segmented, Typography } from "antd";

export default function AutoCompilationConfig() {
  const enabled = Form.useWatch(["autoCompilation", "enabled"]);

  return (
    <Card title="Auto Compilation Videos">
      <Typography.Text
        type="secondary"
        style={{ display: "block", marginBottom: 12 }}
      >
        Periodically builds one themed video from the 5 newest products sharing
        a random tag.
      </Typography.Text>
      <Form.Item
        name={["autoCompilation", "enabled"]}
        label="Enable auto compilation videos"
        initialValue={false}
      >
        <Segmented
          options={[
            { label: "Off", value: false },
            { label: "On", value: true },
          ]}
        />
      </Form.Item>
      <Form.Item
        name={["autoCompilation", "intervalMinutes"]}
        label="Interval between videos (minutes)"
        initialValue={30}
      >
        <InputNumber min={1} style={{ width: "100%" }} disabled={!enabled} />
      </Form.Item>
    </Card>
  );
}
