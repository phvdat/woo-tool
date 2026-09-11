import { Typography } from "antd";
import React, { ReactNode } from "react";
import PageHeader from "./PageHeader";

const { Title } = Typography;
type ContainerProps = {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  style?: React.CSSProperties;
  title?: string;
  subtitle?: string;
  breadcrumb?: { title: string; path?: string }[];
  extra?: ReactNode;
};

const sizeMap = {
  sm: 640,
  md: 960,
  lg: 1200,
  full: "100%",
};

const Container: React.FC<ContainerProps> = ({
  children,
  size = "md",
  style,
  title,
  subtitle,
  breadcrumb,
  extra,
}) => {
  return (
    <div
      style={{
        maxWidth: typeof sizeMap[size] === "number" ? sizeMap[size] : undefined,
        width: "100%",
        ...style,
      }}
    >
      {(title || breadcrumb) && (
        <PageHeader title={title || ""} subtitle={subtitle} breadcrumb={breadcrumb} extra={extra} />
      )}
      {children}
    </div>
  );
};

export default Container;
