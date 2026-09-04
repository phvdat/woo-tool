"use client";

import { Card, Col, Grid, Row, Statistic } from "antd";

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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const valueStyle = {
    fontSize: isMobile ? 20 : 24,
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="Revenue"
            value={totalRevenue}
            precision={2}
            prefix="$"
            valueStyle={valueStyle}
          />
        </Card>
      </Col>

      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="Fees"
            value={totalFees}
            precision={2}
            prefix="$"
            valueStyle={valueStyle}
          />
        </Card>
      </Col>

      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="Net Revenue"
            value={totalNet}
            precision={2}
            prefix="$"
            valueStyle={valueStyle}
          />
        </Card>
      </Col>

      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="Orders"
            value={totalOrders}
            valueStyle={valueStyle}
          />
        </Card>
      </Col>
    </Row>
  );
}
