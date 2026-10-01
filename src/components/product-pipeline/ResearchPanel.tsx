"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useResearchPreview } from "@/app/hooks/useResearchPreview";
import { ResearchTopic, ResearchStatus } from "@/types/research";

const STATUS_COLOR: Record<ResearchStatus, string> = {
  pending: "default",
  researching: "processing",
  completed: "success",
  insufficient: "warning",
  failed: "error",
};

const BAND_COLOR: Record<string, string> = {
  full: "success",
  verified_only: "processing",
  retry: "warning",
  fallback: "error",
};

export default function ResearchPanel() {
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const runPreview = useResearchPreview();

  const run = async (forceRefresh: boolean) => {
    const value = productName.trim();
    if (!value) {
      return;
    }
    setLoading(true);
    try {
      setTopic(await runPreview({ productName: value }, forceRefresh));
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Research failed");
      setTopic(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Product Research (debug)"
      size="small"
      extra={
        <Space>
          <Input
            size="small"
            style={{ width: 320 }}
            placeholder="Paste a product title"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            onPressEnter={() => run(false)}
          />
          <Button size="small" icon={<SearchOutlined />} loading={loading} onClick={() => run(false)}>
            Research
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => run(true)}
          >
            Re-research
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Admin only. Research is also shown here before you enable it per website in
        Settings → Product Settings. The quality score is internal and is never
        published to a storefront.
      </Typography.Paragraph>

      {loading && !topic && <Spin />}

      {!loading && !topic && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No research run yet" />
      )}

      {topic && (
        <Collapse
          ghost
          items={[
            {
              key: "overview",
              label: (
                <Space wrap>
                  <Tag color={STATUS_COLOR[topic.status]}>{topic.status}</Tag>
                  <Typography.Text strong>{topic.topicKey || "(no topic key)"}</Typography.Text>
                  <Tag color={BAND_COLOR[topic.quality.band]}>
                    quality {topic.quality.score}
                  </Tag>
                  <Typography.Text type="secondary">
                    {topic.sources.length} sources · {topic.claims.length} claims
                  </Typography.Text>
                </Space>
              ),
              children: <Overview topic={topic} />,
            },
            {
              key: "story",
              label: "Product story brief",
              children: <Story topic={topic} />,
            },
            {
              key: "claims",
              label: "Claims",
              children: <Claims topic={topic} />,
            },
            {
              key: "sources",
              label: "Sources",
              children: <Sources topic={topic} />,
            },
          ]}
        />
      )}
    </Card>
  );
}

function Overview({ topic }: { topic: ResearchTopic }) {
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="small">
      {topic.reason && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {topic.reason}
        </Typography.Paragraph>
      )}

      <Progress
        percent={topic.quality.score}
        size="small"
        status={topic.quality.band === "fallback" ? "exception" : "normal"}
      />

      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Trend type">{topic.trendType}</Descriptions.Item>
        <Descriptions.Item label="Provisional key">{topic.provisionalTopicKey || "—"}</Descriptions.Item>
        <Descriptions.Item label="Aliases" span={2}>
          {topic.aliases.length ? topic.aliases.join(", ") : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Entities" span={2}>
          {topic.entities.length
            ? topic.entities.map((entity) => (
                <Tag key={entity.name} style={{ marginBottom: 4 }}>
                  {entity.name}
                  <Typography.Text type="secondary" style={{ marginLeft: 4, fontSize: 11 }}>
                    {entity.type}
                  </Typography.Text>
                </Tag>
              ))
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Search intent" span={2}>
          {topic.storyBrief?.searchIntent?.length
            ? topic.storyBrief.searchIntent.join(" · ")
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Researched at">{topic.researchedAt || "—"}</Descriptions.Item>
        <Descriptions.Item label="Expires at">{topic.expiresAt || "—"}</Descriptions.Item>
      </Descriptions>

      {topic.quality.penalties.length > 0 && (
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <Typography.Text type="secondary">Penalties:</Typography.Text>{" "}
          {topic.quality.penalties.join(" · ")}
        </Typography.Paragraph>
      )}

      {topic.queries.length > 0 && (
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <Typography.Text type="secondary">Queries:</Typography.Text>{" "}
          {topic.queries.map((query) => `${query.query} [${query.type}]`).join(" · ")}
        </Typography.Paragraph>
      )}
    </Space>
  );
}

function Story({ topic }: { topic: ResearchTopic }) {
  const brief = topic.storyBrief;
  if (!brief) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No brief was produced" />;
  }

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Topic">{brief.topic}</Descriptions.Item>
        <Descriptions.Item label="Event">{brief.event || "—"}</Descriptions.Item>
        <Descriptions.Item label="Season">{brief.season || "—"}</Descriptions.Item>
        <Descriptions.Item label="Context">{brief.context || "—"}</Descriptions.Item>
        <Descriptions.Item label="Significance">{brief.significance || "—"}</Descriptions.Item>
        <Descriptions.Item label="Fan angle">{brief.fanAngle || "—"}</Descriptions.Item>
        <Descriptions.Item label="Content angle">{brief.contentAngle || "—"}</Descriptions.Item>
      </Descriptions>

      <Typography.Paragraph style={{ marginBottom: 0 }}>
        <Typography.Text type="secondary">Verified facts handed to the writer:</Typography.Text>
      </Typography.Paragraph>
      {brief.verifiedFacts.length ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {brief.verifiedFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : (
        <Typography.Text type="secondary">None</Typography.Text>
      )}
    </Space>
  );
}

function Claims({ topic }: { topic: ResearchTopic }) {
  if (!topic.claims.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No claims" />;
  }

  return (
    <Table
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={topic.claims}
      columns={[
        { title: "Claim", dataIndex: "claim" },
        {
          title: "Type",
          dataIndex: "claimType",
          width: 110,
          render: (value: string) => <Tag>{value.replace("_", " ")}</Tag>,
        },
        {
          title: "Status",
          dataIndex: "status",
          width: 100,
          render: (value: string) => (
            <Tag color={value === "verified" ? "success" : value === "disputed" ? "error" : "default"}>
              {value}
            </Tag>
          ),
        },
        {
          title: "Independent domains",
          dataIndex: "independentDomains",
          width: 180,
          render: (value: string[]) => (value.length ? value.join(", ") : "—"),
        },
        { title: "Confidence", dataIndex: "confidence", width: 90 },
      ]}
    />
  );
}

function Sources({ topic }: { topic: ResearchTopic }) {
  if (!topic.sources.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sources retained" />;
  }

  return (
    <Table
      size="small"
      rowKey="url"
      pagination={false}
      dataSource={topic.sources}
      columns={[
        {
          title: "Title",
          dataIndex: "title",
          render: (value: string, record: { url: string }) => (
            <a href={record.url} target="_blank" rel="noreferrer">
              {value}
            </a>
          ),
        },
        { title: "Publisher", dataIndex: "sourceName", width: 180 },
        {
          title: "Type",
          dataIndex: "sourceType",
          width: 100,
          render: (value: string) => <Tag>{value}</Tag>,
        },
        {
          title: "Tier",
          dataIndex: "tier",
          width: 70,
          render: (value: number) => <Tag color={value === 1 ? "success" : value === 2 ? "blue" : "default"}>T{value}</Tag>,
        },
      ]}
    />
  );
}
