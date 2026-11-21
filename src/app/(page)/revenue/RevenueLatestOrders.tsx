"use client";

import { sanitizeMetadataText } from "@/helper/orderItemMetadata";
import { buildProductStatKey } from "@/services/revenue/aggregateProducts";
import {
  RevenueOrderProduct,
  RevenueProductAttribute,
  RevenueProductStat,
} from "@/types/revenue";
import {
  Table,
  Tag,
  Grid,
  Descriptions,
  Typography,
  Image,
  Space,
  Flex,
  Popover,
  Divider,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type PaymentMethod = "stripe" | "paypal";

interface RevenueLatestOrder {
  id: number;
  websiteId: string;
  website: string;
  customer: string;
  total: number;
  refunded: number;
  revenue: number;
  fee: number;
  net: number;
  status: string;
  date: string;
  paymentMethod: PaymentMethod;
  products?: RevenueOrderProduct[];
}

const statusColors: Record<string, string> = {
  pending: "default",
  processing: "processing",
  "on-hold": "warning",
  completed: "success",
  refunded: "volcano",
  cancelled: "error",
  failed: "error",
  "checkout-draft": "default",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  "on-hold": "On Hold",
  completed: "Completed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  failed: "Failed",
  "checkout-draft": "Checkout Draft",
};

const statusFilters = Object.keys(statusLabels).map((value) => ({
  text: statusLabels[value],
  value,
}));

function formatAmount(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

const IMAGE_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function ProductLink({
  product,
  isMobile,
}: {
  product: RevenueOrderProduct;
  isMobile?: boolean;
}) {
  return product.link ? (
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (isMobile) event.preventDefault();
      }}
    >
      {product.name.slice(0, 10) + "..." || "View product"}
    </a>
  ) : (
    <Text>{product.name.slice(0, 10)}</Text>
  );
}

function dedupeAttributes(pairs: RevenueProductAttribute[]) {
  const seen = new Set<string>();
  const result: RevenueProductAttribute[] = [];

  for (const pair of pairs) {
    const name = sanitizeMetadataText(pair.name);
    const value = sanitizeMetadataText(pair.value);
    if (!name || !value) continue;

    const key = `${name.toLowerCase()}|${value}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({ name, value });
  }

  return result;
}

function AttributeRows({ pairs }: { pairs: RevenueProductAttribute[] }) {
  return (
    <Flex vertical gap={2}>
      {pairs.map((pair, index) => (
        <Flex
          key={`${pair.name}|${pair.value}|${index}`}
          gap={10}
          align="flex-start"
        >
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              flex: "0 0 110px",
              wordBreak: "break-word",
            }}
          >
            {sanitizeMetadataText(pair.name)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              flex: 1,
              wordBreak: "break-word",
            }}
          >
            {sanitizeMetadataText(pair.value)}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

function ProductHoverContent({
  product,
  stat,
}: {
  product: RevenueOrderProduct;
  stat?: RevenueProductStat;
}) {
  const units = product.units ?? [];
  const hasUnits = units.length > 0;
  const quantity = hasUnits
    ? product.quantity
    : stat?.quantity ?? product.quantity;

  let attributes: RevenueProductAttribute[] = product.attributes ?? [];
  let options: RevenueProductAttribute[] = product.options ?? [];

  if (!hasUnits && !attributes.length && !options.length && stat) {
    attributes = (stat.variants ?? []).flatMap(
      (variant) => variant.attributes
    );
    options = (stat.options ?? []).map((option) => ({
      name: option.name,
      value: option.value,
    }));
  }

  attributes = dedupeAttributes(attributes);
  options = dedupeAttributes(options);

  return (
    <Flex vertical gap={10} style={{ width: 300 }}>
      <Flex gap={6} align="baseline">
        <Text strong style={{ fontSize: 12 }}>
          Quantity:
        </Text>
        <Text style={{ fontSize: 13 }}>{quantity}</Text>
      </Flex>

      {attributes.length > 0 && (
        <Flex vertical gap={4}>
          <Text strong style={{ fontSize: 12 }}>
            Variants
          </Text>
          <AttributeRows pairs={attributes} />
        </Flex>
      )}

      {options.length > 0 && (
        <Flex vertical gap={4}>
          <Text strong style={{ fontSize: 12 }}>
            Options
          </Text>
          <AttributeRows pairs={options} />
        </Flex>
      )}

      {hasUnits && (
        <Flex vertical>
          {units.map((unit) => (
            <div key={unit.index}>
              <Divider style={{ margin: "6px 0" }} />
              <Flex vertical gap={4}>
                <Text strong style={{ fontSize: 12 }}>
                  Unit #{unit.index}
                </Text>
                <AttributeRows pairs={unit.fields} />
              </Flex>
            </div>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

function ProductHoverCard({
  product,
  stat,
  isMobile,
  children,
}: {
  product: RevenueOrderProduct;
  stat?: RevenueProductStat;
  isMobile?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover
      trigger={isMobile ? "click" : "hover"}
      placement="rightTop"
      mouseEnterDelay={0.15}
      mouseLeaveDelay={0.1}
      content={<ProductHoverContent product={product} stat={stat} />}
    >
      <span style={{ display: "inline-flex", cursor: "pointer" }}>
        {children}
      </span>
    </Popover>
  );
}

interface RevenueLatestOrdersProps {
  data: RevenueLatestOrder[];
  productStats?: RevenueProductStat[];
  loading?: boolean;
}

export default function RevenueLatestOrders({
  data,
  productStats,
  loading,
}: RevenueLatestOrdersProps) {
  const [filteredData, setFilteredData] = useState<RevenueLatestOrder[]>(data);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const productStatsMap = useMemo(() => {
    const map = new Map<string, RevenueProductStat>();

    for (const stat of productStats ?? []) {
      map.set(stat.key, stat);
    }

    return map;
  }, [productStats]);

  const total = filteredData.reduce(
    (sum, item) => sum + Number(item.revenue ?? item.total ?? 0),
    0,
  );

  const fee = filteredData.reduce(
    (sum, item) => sum + Number(item.fee ?? 0),
    0,
  );

  const net = filteredData.reduce(
    (sum, item) => sum + Number(item.net ?? 0),
    0,
  );
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Table
      rowKey={(record) => `${record.websiteId}-${record.id}`}
      loading={loading}
      pagination={false}
      dataSource={data}
      onChange={(_, __, ___, extra) => {
        setFilteredData(extra.currentDataSource as RevenueLatestOrder[]);
      }}
      expandable={
        isMobile
          ? {
              expandedRowRender: (record) => (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Website">
                    {record.website}
                  </Descriptions.Item>
                  <Descriptions.Item label="Id">{record.id}</Descriptions.Item>

                  <Descriptions.Item label="Customer">
                    {record.customer}
                  </Descriptions.Item>

                  <Descriptions.Item label="Total">
                    {formatAmount(record.total)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Fee">
                    {formatAmount(record.fee)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Net">
                    {formatAmount(record.net)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Created">
                    {dayjs(record.date).format("YYYY-MM-DD HH:mm")}
                  </Descriptions.Item>
                </Descriptions>
              ),
              rowExpandable: () => true,
            }
          : undefined
      }
      columns={[
        {
          title: "Order",
          dataIndex: "id",
          responsive: ["md"],
          width: 100,
          render: (id: number) => `#${id}`,
        },
        {
          title: "Website",
          dataIndex: "website",
          responsive: ["md"],
        },
        {
          title: "Customer",
          dataIndex: "customer",
          responsive: ["md"],
        },
        {
          title: "Product",
          dataIndex: "products",
          render: (
            products: RevenueOrderProduct[] | undefined,
            record: RevenueLatestOrder
          ) => {
            if (!products?.length) return <Text type="secondary">-</Text>;

            const first = products[0];
            const stat = productStatsMap.get(
              buildProductStatKey(record.websiteId, first.productId, first.name)
            );

            return (
              <ProductHoverCard
                product={first}
                stat={stat}
                isMobile={isMobile}
              >
                <Space size={8} align="center">
                  <Image
                    src={first.image || IMAGE_FALLBACK}
                    alt={first.name || "Product image"}
                    width={40}
                    height={40}
                    style={{ objectFit: "cover", borderRadius: 6 }}
                    preview={!isMobile && Boolean(first.image)}
                    fallback={IMAGE_FALLBACK}
                  />
                  <Flex vertical>
                    <ProductLink product={first} isMobile={isMobile} />
                    {products.length > 1 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        +{products.length - 1} more
                      </Text>
                    )}
                  </Flex>
                </Space>
              </ProductHoverCard>
            );
          },
        },
        {
          title: "Gateway",
          dataIndex: "paymentMethod",
          responsive: ["md"],
          filters: [
            {
              text: "Stripe",
              value: "stripe",
            },
            {
              text: "PayPal",
              value: "paypal",
            },
          ],
          onFilter: (value, record) => record.paymentMethod === value,
          render: (value: PaymentMethod) => (
            <Tag color={value === "stripe" ? "blue" : "gold"}>
              {value === "stripe" ? "Stripe" : "PayPal"}
            </Tag>
          ),
        },
        {
          title: "Total",
          dataIndex: "total",
          align: "right",
          responsive: ["md"],
          render: (value: number, record: RevenueLatestOrder) =>
            record.refunded > 0 ? (
              <span>
                <Text delete type="secondary">
                  {formatAmount(value)}
                </Text>{" "}
                {formatAmount(record.revenue ?? 0)}
              </span>
            ) : (
              formatAmount(value)
            ),
        },
        {
          title: "Fee",
          dataIndex: "fee",
          align: "right",
          responsive: ["md"],
          render: (value: number) => formatAmount(value),
        },
        {
          title: "Net",
          dataIndex: "net",
          align: "right",
          render: (value: number) => formatAmount(value),
        },
        {
          title: "Status",
          dataIndex: "status",
          responsive: ["md"],
          filters: statusFilters,
          onFilter: (value, record) => record.status === value,
          render: (status: string) => (
            <Tag color={statusColors[status] ?? "default"}>
              {statusLabels[status] ?? status}
            </Tag>
          ),
        },
        {
          title: "Created",
          dataIndex: "date",
          responsive: ["md"],
          render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
        },
      ]}
      summary={() =>
        isMobile ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <strong>Total</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={4} />

            <Table.Summary.Cell index={7} align="right">
              <strong>${net.toFixed(2)}</strong>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        ) : (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <strong>Total</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={1} />
            <Table.Summary.Cell index={2} />
            <Table.Summary.Cell index={3} />
            <Table.Summary.Cell index={4} />

            <Table.Summary.Cell index={5} align="right">
              <strong>${total.toFixed(2)}</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={6} align="right">
              <strong>${fee.toFixed(2)}</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={7} align="right">
              <strong>${net.toFixed(2)}</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={8} />
            <Table.Summary.Cell index={9} />
          </Table.Summary.Row>
        )
      }
    />
  );
}
