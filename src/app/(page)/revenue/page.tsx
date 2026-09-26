"use client";

import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import Container from "@/components/commons/Container";
import { endpoint } from "@/constant/endpoint";
import { Button, Card, Flex, message, Spin } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import RevenueChart from "./RevenueChart";
import RevenueFilter, { RevenueFilterValue } from "./RevenueFilter";
import RevenueLatestOrders from "./RevenueLatestOrders";
import RevenueSummary from "./RevenueSummary";
import RevenueWebsiteTable from "./RevenueWebsiteTable";

const DEFAULT_FILTER: RevenueFilterValue = {
  groupBy: "day",
  range: [dayjs().subtract(7, "day"), dayjs()],
  websiteId: "all",
};

export default function RevenuePage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { websiteConfigList, isLoading } = useConfigWebsite();
  const [filterValues, setFilterValues] = useState<RevenueFilterValue>(
    DEFAULT_FILTER
  );

  const [data, setData] = useState({
    summary: {
      totalRevenue: 0,
      totalNet: 0,
      totalFees: 0,
      totalRefunded: 0,
      totalOrders: 0,
      averageOrderValue: 0,
    },
    chart: [],
    websiteStats: [],
    latestOrders: [],
  });

  useEffect(() => {
    handleSearch(DEFAULT_FILTER);
  }, []);

  // Reads persisted Revenue History only — never calls WooCommerce.
  async function handleSearch(values: RevenueFilterValue) {
    setLoading(true);
    setFilterValues(values);

    try {
      const { data } = await axios.post(endpoint.revenue, {
        websiteId: values.websiteId,
        groupBy: values.groupBy,
        from: values.range[0].format("YYYY-MM-DDTHH:mm:ssZ"),
        to: values.range[1].format("YYYY-MM-DDTHH:mm:ssZ"),
      });

      setData(data);
    } finally {
      setLoading(false);
    }
  }

  // Fetches WooCommerce, upserts into Revenue History, then reloads the history.
  async function handleRefresh() {
    setRefreshing(true);

    try {
      const { data: result } = await axios.post(endpoint.revenueRefresh);

      messageApi.success(
        `Refreshed ${result.upserted + result.modified} order(s) from WooCommerce`
      );

      await handleSearch(filterValues);
    } catch (error: any) {
      messageApi.error(error?.response?.data?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Container
      title="Revenue Dashboard"
      subtitle="Track your sales and revenue analytics"
      size="lg"
      extra={
        <Button
          icon={<SyncOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
        >
          Refresh
        </Button>
      }
    >
      {contextHolder}
      <Spin spinning={isLoading}>
        <Flex vertical gap={16}>
          <Card>
            <RevenueFilter
              websites={websiteConfigList}
              loading={loading}
              onChange={handleSearch}
            />
          </Card>

          <Card>
            <RevenueChart data={data.chart} />
          </Card>

          <RevenueSummary {...data.summary} />

          <Card>
            <RevenueWebsiteTable data={data.websiteStats} loading={loading} />
          </Card>

          <Card title="Latest Orders">
            <RevenueLatestOrders data={data.latestOrders} loading={loading} />
          </Card>
        </Flex>
      </Spin>
    </Container>
  );
}
