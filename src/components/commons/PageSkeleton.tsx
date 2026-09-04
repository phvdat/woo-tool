import { Card, Skeleton, Row, Col } from "antd";

interface PageSkeletonProps {
  cards?: number;
  tableRows?: number;
}

export default function PageSkeleton({ cards = 2, tableRows = 5 }: PageSkeletonProps) {
  return (
    <div>
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: "30%" }} />
        <div style={{ marginTop: 16 }}>
          <Skeleton.Input active style={{ width: "100%", height: 36 }} />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {Array.from({ length: cards }).map((_, i) => (
          <Col xs={24} sm={12} lg={8} key={i}>
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 2 }} title={{ width: "60%" }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 12, marginTop: 24 }}>
        <Skeleton active paragraph={{ rows: tableRows }} title={{ width: "25%" }} />
      </Card>
    </div>
  );
}
