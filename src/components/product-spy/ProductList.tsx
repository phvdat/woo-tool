"use client";

import { useSpyCompetitors } from "@/app/hooks/useSpyCompetitors";
import { useSpyProducts, SpyProductItem } from "@/app/hooks/useSpyProducts";
import { EyeOutlined, LinkOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  List,
  Pagination,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useState, useMemo } from "react";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Option } = Select;

type PresetRange = "today" | "yesterday" | "7days" | "custom";

function formatDateGroup(dateStr: string): string {
  return dayjs(dateStr).format("YYYY-MM-DD (ddd)");
}

interface GroupedProducts {
  date: string;
  products: SpyProductItem[];
}

export default function ProductList() {
  const { competitors } = useSpyCompetitors();

  const [preset, setPreset] = useState<PresetRange>("7days");
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [competitorFilter, setCompetitorFilter] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { from, to } = useMemo(() => {
    const today = dayjs();
    switch (preset) {
      case "today":
        return {
          from: today.format("YYYY-MM-DD"),
          to: today.format("YYYY-MM-DD"),
        };
      case "yesterday":
        return {
          from: today.subtract(1, "day").format("YYYY-MM-DD"),
          to: today.subtract(1, "day").format("YYYY-MM-DD"),
        };
      case "7days":
        return {
          from: today.subtract(6, "day").format("YYYY-MM-DD"),
          to: today.format("YYYY-MM-DD"),
        };
      case "custom":
        return {
          from: customRange[0]?.format("YYYY-MM-DD") || undefined,
          to: customRange[1]?.format("YYYY-MM-DD") || undefined,
        };
      default:
        return { from: undefined, to: undefined };
    }
  }, [preset, customRange]);

  const { response, isLoading } = useSpyProducts({
    from,
    to,
    competitorId: competitorFilter,
    page,
    pageSize,
  });

  const grouped = useMemo<GroupedProducts[]>(() => {
    if (!response?.products) return [];
    const map = new Map<string, SpyProductItem[]>();
    for (const p of response.products) {
      const day = dayjs(p.firstSeenAt).format("YYYY-MM-DD");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(p);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, products]) => ({ date, products }));
  }, [response?.products]);

  return (
    <Card
      title={
        <Space>
          <EyeOutlined />
          <span>Detected Products</span>
          {response && <Tag color="blue">{response.total} total</Tag>}
        </Space>
      }
      size="small"
    >
      <div style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Space>
            <Text type="secondary">Range:</Text>
            <Select
              value={preset}
              onChange={(v) => {
                setPreset(v);
                setPage(1);
              }}
              style={{ width: 130 }}
              size="small"
            >
              <Option value="today">Today</Option>
              <Option value="yesterday">Yesterday</Option>
              <Option value="7days">Last 7 days</Option>
              <Option value="custom">Custom range</Option>
            </Select>
          </Space>

          {preset === "custom" && (
            <RangePicker
              value={customRange as any}
              onChange={(dates) => {
                setCustomRange(dates as [Dayjs | null, Dayjs | null]);
                setPage(1);
              }}
              size="small"
            />
          )}

          <Space>
            <Text type="secondary">Competitor:</Text>
            <Select
              value={competitorFilter}
              onChange={(v) => {
                setCompetitorFilter(v);
                setPage(1);
              }}
              allowClear
              placeholder="All competitors"
              style={{ width: 200 }}
              size="small"
            >
              {competitors?.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Space>
        </Space>
      </div>

      {isLoading ? (
        <List loading />
      ) : grouped.length === 0 ? (
        <Empty description="No products found for this period" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grouped.map((group) => (
            <div key={group.date}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  {formatDateGroup(group.date)}
                </Title>
                <Tag>{group.products.length} products</Tag>
              </div>

              <List
                grid={{
                  gutter: 12,
                  xs: 1,
                  sm: 2,
                  md: 2,
                  lg: 3,
                  xl: 4,
                }}
                dataSource={group.products}
                renderItem={(item) => (
                  <List.Item style={{ height: "100%" }}>
                    <Card
                      size="small"
                      hoverable
                      cover={
                        item.image ? (
                          <div
                            style={{
                              height: 160,
                              overflow: "hidden",
                              background: "#f5f5f5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        ) : null
                      }
                      actions={[
                        <a
                          key="link"
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LinkOutlined /> View
                        </a>,
                      ]}
                    >
                      <Card.Meta
                        // title={
                        //   <Text
                        //     ellipsis={{ tooltip: item.title }}
                        //     style={{ fontSize: 13 }}
                        //   >
                        //     {item.title}
                        //   </Text>
                        // }
                        description={
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            {item.price && (
                              <Text
                                strong
                                style={{ color: "#52c41a", fontSize: 14 }}
                              >
                                ${parseFloat(item.price).toFixed(2)}
                              </Text>
                            )}

                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.competitorName}
                            </Text>

                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {dayjs(item.firstSeenAt).format("HH:mm")}
                            </Text>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          ))}

          {response && response.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              <Pagination
                current={response.page}
                total={response.total}
                pageSize={response.pageSize}
                onChange={setPage}
                showSizeChanger={false}
                showTotal={(total) => `${total} products`}
                size="small"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
