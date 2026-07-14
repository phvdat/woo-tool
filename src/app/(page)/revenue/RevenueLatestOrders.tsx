"use client";

import { Table, Tag } from "antd";
import dayjs from "dayjs";

interface RevenueLatestOrder {
  id: number;
  website: string;
  customer: string;
  total: number;
  status: string;
  date: string;
}

interface RevenueLatestOrdersProps {
  data: RevenueLatestOrder[];
  loading?: boolean;
}

export default function RevenueLatestOrders({
  data,
  loading,
}: RevenueLatestOrdersProps) {
  return (
    <Table
      rowKey="id"
      loading={loading}
      pagination={false}
      dataSource={data}
      columns={[
        {
          title: "Order",
          dataIndex: "id",
          width: 100,
          render: (id) => `#${id}`,
        },
        {
          title: "Website",
          dataIndex: "website",
        },
        {
          title: "Customer",
          dataIndex: "customer",
        },
        {
          title: "Total",
          dataIndex: "total",
          align: "right",
          render: (value: number) => `$${value.toFixed(2)}`,
        },
        {
          title: "Status",
          dataIndex: "status",
          render: (status: string) => (
            <Tag color="green">{status}</Tag>
          ),
        },
        {
          title: "Created",
          dataIndex: "date",
          render: (value: string) =>
            dayjs(value).format("YYYY-MM-DD HH:mm"),
        },
      ]}
    />
  );
}