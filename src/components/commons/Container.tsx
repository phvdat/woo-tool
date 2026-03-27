import { Typography } from "antd";
import React, { ReactNode } from "react";

const { Title } = Typography;
type ContainerProps = {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
  title?: string; // optional title
};

const sizeMap = {
  sm: 640,
  md: 960,
  lg: 1200,
};

const Container: React.FC<ContainerProps> = ({
  children,
  size = "md",
  style,
  title,
}) => {
  return (
    <div
      style={{
        maxWidth: sizeMap[size],
        padding: "16px",
        margin: "16px auto",
        width: "100%",
        ...style,
      }}
    >
      {title && (
        <Title level={4} style={{ textAlign: "center", margin: "16px" }}>
          {title}
        </Title>
      )}
      {children}
    </div>
  );
};

export default Container;
