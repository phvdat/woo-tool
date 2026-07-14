"use client";

import { Card, Col, Row, Statistic } from "antd";

interface RevenueSummaryProps {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export default function RevenueSummary({
  totalRevenue,
  totalOrders,
  averageOrderValue,
}: RevenueSummaryProps) {
  return (
    <Row gutter={16}>
      <Col span={8}>
        <Card>
          <Statistic
            title="Total Revenue"
            value={totalRevenue}
            precision={2}
            prefix="$"
          />
        </Card>
      </Col>

      <Col span={8}>
        <Card>
          <Statistic
            title="Orders"
            value={totalOrders}
          />
        </Card>
      </Col>

      <Col span={8}>
        <Card>
          <Statistic
            title="Average Order"
            value={averageOrderValue}
            precision={2}
            prefix="$"
          />
        </Card>
      </Col>
    </Row>
  );
}