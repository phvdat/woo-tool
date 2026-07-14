"use client";
import { Line } from "@ant-design/charts";

interface RevenueItem {
  time: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueItem[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Line
      height={350}
      data={data}
      xField="time"
      yField="revenue"
      point={{
        size: 3,
      }}
      smooth
      tooltip={{
        items: [
          (datum: RevenueItem) => ({
            name: "Revenue",
            value: `$${datum.revenue.toFixed(2)}`,
          }),
        ],
      }}
      axis={{
        y: {
          labelFormatter: (v: number) => `$${Number(v).toFixed(0)}`,
        },
      }}
    />
  );
}
