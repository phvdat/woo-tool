"use client";

import { Card, Flex, Form, Tag, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";

export default function YouTubeCommentTemplate() {
  return (
    <Card title="YouTube Comment Template">
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Custom template for YouTube video comments. Leave empty to use product URL only.
      </Typography.Text>
      <Form.Item name="youtubeCommentTemplate">
        <TextArea
          rows={4}
          placeholder={`Shop now: {productUrl}\n\n{tagsHashtags}`}
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
