"use client";

import { Table, Tag, Grid, Descriptions } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

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
  const [filteredData, setFilteredData] = useState<RevenueLatestOrder[]>(data);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const total = filteredData.reduce(
    (sum, item) => sum + Number(item.total ?? 0),
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
      rowKey="id"
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

                  <Descriptions.Item label="Customer">
                    {record.customer}
                  </Descriptions.Item>

                  <Descriptions.Item label="Total">
                    ${Number(record.total).toFixed(2)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Fee">
                    ${Number(record.fee).toFixed(2)}
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
          render: (value: number) => `$${Number(value).toFixed(2)}`,
        },
        {
          title: "Fee",
          dataIndex: "fee",
          align: "right",
          responsive: ["md"],
          render: (value: number) => `$${Number(value).toFixed(2)}`,
        },
        {
          title: "Net",
          dataIndex: "net",
          align: "right",
          render: (value: number) => `$${Number(value ?? 0).toFixed(2)}`,
        },
        {
          title: "Status",
          dataIndex: "status",
          responsive: ["md"],
          render: (status: string) => (
            <Tag color={status === "paid" ? "success" : "default"}>
              {status}
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
            <Table.Summary.Cell index={1} />
            <Table.Summary.Cell index={2} />

            <Table.Summary.Cell index={3} align="right">
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

            <Table.Summary.Cell index={4} align="right">
              <strong>${total.toFixed(2)}</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={5} align="right">
              <strong>${fee.toFixed(2)}</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={6} align="right">
              <strong>${net.toFixed(2)}</strong>
            </Table.Summary.Cell>

            <Table.Summary.Cell index={7} />
            <Table.Summary.Cell index={8} />
          </Table.Summary.Row>
        )
      }
    />
  );
}
