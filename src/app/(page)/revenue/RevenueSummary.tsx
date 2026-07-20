"use client";

import { Card, Col, Row, Statistic } from "antd";

interface RevenueSummaryProps {
  totalRevenue: number;
  totalFees: number;
  totalNet: number;
  totalOrders: number;
  averageOrderValue: number;
}

export default function RevenueSummary({
  totalRevenue,
  totalFees,
  totalNet,
  totalOrders,
  averageOrderValue,
}: RevenueSummaryProps) {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="Total Revenue"
            value={totalRevenue}
            precision={2}
            prefix="$"
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Total Fee"
            value={totalFees}
            precision={2}
            prefix="$"
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Total Net"
            value={totalNet}
            precision={2}
            prefix="$"
          />
        </Card>
      </Col>

      <Col span={6}>
        <Card>
          <Statistic
            title="Orders"
            value={totalOrders}
          />
        </Card>
      </Col>
    </Row>
  );
}