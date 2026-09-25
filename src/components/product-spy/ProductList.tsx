"use client";

import { SpyProductItem, useSpyProducts } from "@/app/hooks/useSpyProducts";
import { endpoint } from "@/constant/endpoint";
import {
  CheckOutlined,
  CopyOutlined,
  EyeOutlined,
  FileExcelOutlined,
  LinkOutlined,
  PlusOutlined,
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
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import { saveAs } from "file-saver";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  clearAllSelected,
  getProductKey,
  loadSelectedEntries,
  loadSelectedKeys,
  loadSelectedUrls,
  resolveImages,
  saveToggle,
} from "./productSelectionHelper";
import { upscaleImage } from "@/helper/common";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Option } = Select;

const APPAREL_KEYWORDS = [
  // General apparel
  "apparel",
  "clothing",
  "clothes",
  "tee",
  "tees",
  "tshirt",
  "t-shirt",
  "shirt",
  "tank",
  "tank top",
  "jersey",
  "hoodie",
  "sweatshirt",
  "sweater",
  "crewneck",
  "pullover",
  "jacket",
  "vest",
  "windbreaker",
  "varsity",
  "cardigan",
  "long sleeve",
  "crop top",
  "polo",

  // Sports / fan apparel
  "baseball",
  "football",
  "basketball",
  "hockey",
  "soccer",
  "softball",
  "jersey",
  "uniform",
  "fanwear",
  "sportswear",

  // League / sports abbreviations
  "mlb",
  "nfl",
  "nhl",
  "nba",
  "wnba",
  "ncaa",
  "nascar",
  "mls",
  "nrl",
  "afl",

  // Sneakers / shoes
  "sneaker",
  "sneakers",
  "shoe",
  "shoes",
  "footwear",
  "af1",
  "air force",
  "air jordan",
  "aj1",
  "aj",
  "jordan",
  "dunk",
  "air max",
  "air max plus",
  "tn",
  "trainer",
  "trainers",
];

const PLATFORMS = [
  { value: "woocommerce", label: "WooCommerce" },
  { value: "shopify", label: "Shopify" },
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
  const [exporting, setExporting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    setSelected(loadSelectedKeys());
  }, []);

  const toggleSelect = useCallback((item: SpyProductItem) => {
    setSelected(saveToggle(item));
  }, []);

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs(),
    dayjs(),
  ]);
  const [platformFilter, setPlatformFilter] = useState<string | undefined>(
    PLATFORMS[0].value,
  );

  const [apparelOnly, setApparelOnly] = useState(false);
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
    let products = response.products;
    if (apparelOnly) {
      products = products.filter((p) =>
        APPAREL_KEYWORDS.some((kw) =>
          p.title.toLowerCase().includes(kw.toLowerCase()),
        ),
      );
    }
    const map = new Map<string, SpyProductItem[]>();
    for (const p of products) {
      const day = dayjs(p.firstSeenAt).format("YYYY-MM-DD");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(p);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, products]) => ({ date, products }));
  }, [response?.products, apparelOnly]);

  const filteredTotal = useMemo(() => {
    if (!response?.products) return 0;
    if (!apparelOnly) return response.total;
    return response.products.filter((p) =>
      APPAREL_KEYWORDS.some((kw) =>
        p.title.toLowerCase().includes(kw.toLowerCase()),
      ),
    ).length;
  }, [response, apparelOnly]);

  const productsByKey = useMemo(() => {
    const map = new Map<string, SpyProductItem>();
    for (const product of response?.products || []) {
      map.set(getProductKey(product), product);
    }
    return map;
  }, [response?.products]);

  const copyUrls = useCallback(() => {
    if (selected.size === 0) return;

    const urls = loadSelectedUrls().filter((u) => u);
    if (urls.length === 0) return;

    navigator.clipboard.writeText(urls.join("\n")).then(() => {
      messageApi.success(
        `Copied ${urls.length} product URL${urls.length > 1 ? "s" : ""}`,
      );
    });
  }, [selected, messageApi]);

  const clearSelection = useCallback(() => {
    clearAllSelected();
    setSelected(new Set());
  }, []);

  const downloadExcel = useCallback(async (): Promise<boolean> => {
    if (selected.size === 0) return false;

    const entries = loadSelectedEntries();
    if (entries.length === 0) {
      messageApi.warning("No selected product data to export");
      return false;
    }

    setExporting(true);
    let downloaded = false;

    try {
      const rows = entries.map((entry) => {
        const product = productsByKey.get(entry.key);
        const images = resolveImages(
          product?.image ?? entry.image,
          product?.images ?? entry.images,
        );

        return {
          Name: product?.title || entry.title || "",
          Images: images.join(","),
          Link: product?.url || entry.url || "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");

      const fileName = `product-spy-${dayjs().format(
        "YYYY-MM-DD-HH-mm-ss",
      )}.xlsx`;
      const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const file = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(file, fileName);
      downloaded = true;

      const formData = new FormData();
      formData.append("file", file, fileName);
      await axios.post(endpoint.spyExportExcel, formData);

      const productLabel = `${rows.length} product${
        rows.length > 1 ? "s" : ""
      }`;
      const withoutImages = rows.filter((row) => !row.Images).length;
      if (withoutImages > 0) {
        messageApi.warning(
          `Exported ${productLabel} and sent the file to Telegram, but ${withoutImages} row${withoutImages > 1 ? "s" : ""} have no image data. Re-select them to refresh.`,
        );
      } else {
        messageApi.success(
          `Exported ${productLabel} and sent the file to Telegram`,
        );
      }

      return true;
    } catch (error: any) {
      const telegramError = error?.response?.data?.error || "Please try again.";

      if (downloaded) {
        messageApi.warning(
          `Excel downloaded, but sending it to Telegram failed: ${telegramError}`,
        );
      } else {
        messageApi.error(`Failed to create Excel: ${telegramError}`);
      }

      return false;
    } finally {
      setExporting(false);
    }
  }, [selected, messageApi, productsByKey]);

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <EyeOutlined />
            <span>Detected Products</span>
            {response && (
              <Tag color={apparelOnly ? "orange" : "blue"}>
                {apparelOnly ? filteredTotal : response.total} total
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Selected: {selected.size}
            </Text>
            <Popconfirm
              title="Clear all selected products?"
              onConfirm={async () => {
                copyUrls();
                const sent = await downloadExcel();
                if (sent) clearSelection();
              }}
              onCancel={downloadExcel}
              okText="Yes"
              cancelText="No"
            >
              <Button
                size="small"
                icon={<FileExcelOutlined />}
                loading={exporting}
                disabled={selected.size === 0 || exporting}
              >
                Download Excel
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
                  {
                    label: "Yesterday",
                    value: [
                      dayjs().subtract(1, "day"),
                      dayjs().subtract(1, "day"),
                    ],
                  },
                  {
                    label: "Last 7 days",
                    value: [dayjs().subtract(6, "day"), dayjs()],
                  },
                  {
                    label: "Last 30 days",
                    value: [dayjs().subtract(29, "day"), dayjs()],
                  },
                ]}
                size="small"
              />
            </Space>

            <Space>
              <Text type="secondary">Platform:</Text>
              <Select
                defaultValue={PLATFORMS[0].value}
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

            <Space>
              <Text type="secondary">Apparel Only:</Text>
              <Switch
                size="small"
                checked={apparelOnly}
                onChange={(checked) => {
                  setApparelOnly(checked);
                  setPage(1);
                }}
              />
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
                    xs: 2,
                    sm: 2,
                    md: 3,
                    lg: 4,
                    xl: 6,
                    xxl: 6,
                  }}
                  dataSource={group.products}
                  renderItem={(item) => (
                    <List.Item style={{ height: "100%" }}>
                      <Card
                        size="small"
                        hoverable
                        bordered={selected.has(getProductKey(item))}
                        style={{
                          borderColor: "#52c41a",
                          borderWidth: 2,
                        }}
                        cover={
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
                              src={item?.image}
                              alt={item.title}
                              width="100%"
                              height={160}
                              style={{ objectFit: "cover" }}
                              preview
                              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                            />
                          </div>
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
                            style={
                              selected.has(getProductKey(item))
                                ? { color: "#52c41a" }
                                : undefined
                            }
                            icon={
                              selected.has(getProductKey(item)) ? (
                                <CheckOutlined />
                              ) : (
                                <PlusOutlined />
                              )
                            }
                            onClick={() => toggleSelect(item)}
                          >
                            {selected.has(getProductKey(item))
                              ? "Added"
                              : "Add"}
                          </Button>,
                        ]}
                      >
                        <Card.Meta
                          title={
                            <Text
                              ellipsis={{ tooltip: item.title }}
                              style={{ fontSize: 13 }}
                            >
                              {item.title}
                            </Text>
                          }
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
