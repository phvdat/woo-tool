"use client";

import { Descriptions, Table, Grid } from "antd";

interface RevenueWebsiteItem {
  website: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

interface RevenueWebsiteTableProps {
  data: RevenueWebsiteItem[];
  loading?: boolean;
}

export default function RevenueWebsiteTable({
  data,
  loading,
}: RevenueWebsiteTableProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Table
      rowKey="website"
      loading={loading}
      pagination={false}
      dataSource={data}
      expandable={
        isMobile
          ? {
              expandedRowRender: (record) => (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Orders">
                    {record.orders}
                  </Descriptions.Item>

                  <Descriptions.Item label="Average Order">
                    ${record.averageOrderValue.toFixed(2)}
                  </Descriptions.Item>
                </Descriptions>
              ),
            }
          : undefined
      }
      columns={[
        {
          title: "Website",
          dataIndex: "website",
        },
        {
          title: "Revenue",
          dataIndex: "revenue",
          align: "right",
          render: (value: number) => `$${value.toFixed(2)}`,
          sorter: (a, b) => a.revenue - b.revenue,
        },
        {
          title: "Orders",
          dataIndex: "orders",
          align: "right",
          responsive: ["md"],
          sorter: (a, b) => a.orders - b.orders,
        },
        {
          title: "Average Order",
          dataIndex: "averageOrderValue",
          align: "right",
          responsive: ["md"],
          render: (value: number) => `$${value.toFixed(2)}`,
          sorter: (a, b) => a.averageOrderValue - b.averageOrderValue,
        },
      ]}
    />
  );
}
