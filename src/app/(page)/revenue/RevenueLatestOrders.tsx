"use client";

import { Table, Tag } from "antd";
import dayjs from "dayjs";

type PaymentMethod = "stripe" | "paypal";

interface RevenueLatestOrder {
  id: number;
  website: string;
  customer: string;
  total: number;
  fee: number;
  net: number;
  status: string;
  date: string;
  paymentMethod: PaymentMethod;
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
          title: "Gateway",
          dataIndex: "paymentMethod",
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
          render: (value) => (value === "stripe" ? "Stripe" : "PayPal"),
        },
        {
          title: "Total",
          dataIndex: "total",
          align: "right",
          render: (value: number) => `$${Number(value).toFixed(2)}`,
        },
        {
          title: "Fee",
          dataIndex: "fee",
          align: "right",
          render: (value: number) => `$${Number(value).toFixed(2)}`,
        },
        {
          title: "Net",
          dataIndex: "net",
          align: "right",
          render: (value: number) => `$${Number(value).toFixed(2)}`,
        },
        {
          title: "Status",
          dataIndex: "status",
          render: (status: string) => <Tag color="green">{status}</Tag>,
        },
        {
          title: "Created",
          dataIndex: "date",
          render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
        },
      ]}
    />
  );
}
