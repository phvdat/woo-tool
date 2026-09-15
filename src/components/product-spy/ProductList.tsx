"use client";

import { useSpyProducts, SpyProductItem } from "@/app/hooks/useSpyProducts";
import {
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  PlusOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Image,
  List,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  getProductKey,
  loadSelectedKeys,
  loadSelectedUrls,
  saveToggle,
  clearAllSelected,
} from "./productSelectionHelper";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Option } = Select;

const PLATFORMS = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "shopbase", label: "ShopBase" },
  { value: "teechip", label: "TeeChip" },
  { value: "merchize", label: "Merchize" },
  { value: "merchking", label: "MerchKing" },
  { value: "lattex", label: "Lattex" },
  { value: "generic", label: "Generic" },
];

function formatDateGroup(dateStr: string): string {
  return dayjs(dateStr).format("YYYY-MM-DD (ddd)");
}

interface GroupedProducts {
  date: string;
  products: SpyProductItem[];
}

export default function ProductList() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    setSelected(loadSelectedKeys());
  }, []);

  const toggleSelect = useCallback(
    (item: SpyProductItem) => {
      setSelected(saveToggle(item));
    },
    [],
  );

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);
  const [platformFilter, setPlatformFilter] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { from, to } = useMemo(() => {
    return {
      from: range[0]?.format("YYYY-MM-DD") || undefined,
      to: range[1]?.format("YYYY-MM-DD") || undefined,
    };
  }, [range]);

  const { response, isLoading } = useSpyProducts({
    from,
    to,
    platform: platformFilter,
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

  const copyUrls = useCallback(() => {
    if (selected.size === 0) return;

    const urls = loadSelectedUrls().filter((u) => u);
    if (urls.length === 0) return;

    navigator.clipboard.writeText(urls.join("\n")).then(() => {
      messageApi.success(`Copied ${urls.length} product URL${urls.length > 1 ? "s" : ""}`);
    });
  }, [selected, messageApi]);

  const clearSelection = useCallback(() => {
    clearAllSelected();
    setSelected(new Set());
  }, []);

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <EyeOutlined />
            <span>Detected Products</span>
            {response && <Tag color="blue">{response.total} total</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Selected: {selected.size}
            </Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              disabled={selected.size === 0}
              onClick={copyUrls}
            >
              Copy
            </Button>
            <Popconfirm
              title="Clear all selected products?"
              onConfirm={clearSelection}
              okText="Yes"
              cancelText="No"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={selected.size === 0}
              >
                Clear
              </Button>
            </Popconfirm>
          </Space>
        }
        size="small"
      >
      <div style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Space>
            <Text type="secondary">Range:</Text>
            <RangePicker
              value={range}
              onChange={(dates) => {
                setRange(dates as [Dayjs | null, Dayjs | null]);
                setPage(1);
              }}
              presets={[
                { label: "Today", value: [dayjs(), dayjs()] },
                { label: "Yesterday", value: [dayjs().subtract(1, "day"), dayjs().subtract(1, "day")] },
                { label: "Last 7 days", value: [dayjs().subtract(6, "day"), dayjs()] },
                { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
              ]}
              size="small"
            />
          </Space>

          <Space>
            <Text type="secondary">Platform:</Text>
            <Select
              value={platformFilter}
              onChange={(v) => {
                setPlatformFilter(v);
                setPage(1);
              }}
              allowClear
              placeholder="All Platforms"
              style={{ width: 200 }}
              size="small"
            >
              {PLATFORMS.map((p) => (
                <Option key={p.value} value={p.value}>
                  {p.label}
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Image
                              src={item.image}
                              alt={item.title}
                              width="100%"
                              height={160}
                              style={{ objectFit: "cover" }}
                              preview
                              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
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
                        <Button
                          key="select"
                          type="text"
                          size="small"
                          icon={
                            selected.has(getProductKey(item)) ? (
                              <CheckOutlined style={{ color: "#52c41a" }} />
                            ) : (
                              <PlusOutlined />
                            )
                          }
                          onClick={() => toggleSelect(item)}
                        >
                          {selected.has(getProductKey(item)) ? "Added" : "Add"}
                        </Button>,
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
    </>
  );
}
