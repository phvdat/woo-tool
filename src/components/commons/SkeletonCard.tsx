import { Card, Skeleton, Space } from "antd";

interface SkeletonCardProps {
  rows?: number;
  avatar?: boolean;
  active?: boolean;
}

export default function SkeletonCard({ rows = 3, avatar = false, active = true }: SkeletonCardProps) {
  return (
    <Card style={{ borderRadius: 12 }}>
      <Skeleton
        avatar={avatar}
        active={active}
        paragraph={{ rows }}
        title={{ width: "40%" }}
      />
    </Card>
  );
}
