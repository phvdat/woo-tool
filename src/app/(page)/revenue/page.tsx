"use client";

import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import { endpoint } from "@/constant/endpoint";
import { Card, Flex, Spin, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import RevenueChart from "./RevenueChart";
import RevenueFilter, { RevenueFilterValue } from "./RevenueFilter";
import RevenueLatestOrders from "./RevenueLatestOrders";
import RevenueSummary from "./RevenueSummary";
import RevenueWebsiteTable from "./RevenueWebsiteTable";

export default function RevenuePage() {
  const [loading, setLoading] = useState(false);
  const { websiteConfigList, isLoading } = useConfigWebsite();

  const [data, setData] = useState({
    summary: {
      totalRevenue: 0,
      totalNet: 0,
      totalFees: 0,
      totalOrders: 0,
      averageOrderValue: 0,
    },
    chart: [],
    websiteStats: [],
    latestOrders: [],
  });

  useEffect(() => {
    handleSearch({
      groupBy: "day",
      range: [dayjs().subtract(7, "day"), dayjs()],
      websiteId: "all",
    });
  }, []);

  async function handleSearch(values: RevenueFilterValue) {
    setLoading(true);

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

  return (
    <Spin spinning={isLoading}>
      <Flex vertical gap={16}>
        <Typography.Title level={3}>Revenue Dashboard</Typography.Title>

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
  );
}
