"use client";

import { Breadcrumb, Typography } from "antd";
import { ReactNode } from "react";

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: { title: string; path?: string }[];
  extra?: ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumb, extra }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={breadcrumb.map((item) => ({
            title: item.path ? <a href={item.path}>{item.title}</a> : item.title,
          }))}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ marginTop: 4, display: "block" }}>
              {subtitle}
            </Text>
          )}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}
