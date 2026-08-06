"use client";

import { Table } from "antd";

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
  return (
    <Table
      rowKey="website"
      loading={loading}
      pagination={false}
      dataSource={data}
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
          sorter: (a, b) => a.orders - b.orders,
        },
        {
          title: "Average Order",
          dataIndex: "averageOrderValue",
          align: "right",
          render: (value: number) => `$${value.toFixed(2)}`,
          sorter: (a, b) => a.averageOrderValue - b.averageOrderValue,
        },
      ]}
    />
  );
}
