import { Button, Empty, Typography } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { ReactNode } from "react";

const { Text } = Typography;

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title = "No data",
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <Empty
        image={icon || <InboxOutlined style={{ fontSize: 48, color: "#D1D5DB" }} />}
        imageStyle={{ height: 60 }}
        description={
          <div>
            <Text style={{ fontSize: 16, fontWeight: 500, display: "block", marginBottom: 4 }}>
              {title}
            </Text>
            {description && (
              <Text type="secondary" style={{ fontSize: 14 }}>
                {description}
              </Text>
            )}
          </div>
        }
      >
        {actionLabel && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  );
}
