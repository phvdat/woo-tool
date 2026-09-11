"use client";

import { Card, Flex, Form, Tag, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";

export default function YouTubeDescriptionTemplate() {
  return (
    <Card title="YouTube Description Template">
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Custom template for YouTube video descriptions. Leave empty for default format.
      </Typography.Text>
      <Form.Item name="youtubeDescriptionTemplate">
        <TextArea
          rows={6}
          placeholder={`Shop now: {productUrl}\n\n{productName}\n\n{shortDescription}\n\nDiscover more at {shopName}: {siteUrl}\n\n{tagsHashtags}`}
        />
      </Form.Item>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
        Available placeholders:
      </Typography.Text>
      <Flex wrap="wrap" gap={4} style={{ marginTop: 4 }}>
        {["{productName}", "{shortDescription}", "{productUrl}", "{shopName}", "{siteUrl}", "{tags}", "{tagsHashtags}"].map((p) => (
          <Tag key={p} style={{ fontSize: 11 }}>{p}</Tag>
        ))}
      </Flex>
    </Card>
  );
}
