"use client";

import Container from "@/components/commons/Container";
import { Tabs } from "antd";
import CompetitorTable from "./CompetitorTable";
import ProductList from "./ProductList";

export default function ProductSpyPage() {
  return (
    <Container
      title="Product Spy"
      subtitle="Monitor competitor stores for new products"
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Tabs
          defaultActiveKey="products"
          items={[
            {
              key: "products",
              label: "Products",
              children: <ProductList />,
            },
            {
              key: "competitors",
              label: "Competitors",
              children: <CompetitorTable />,
            },
          ]}
        />
      </div>
    </Container>
  );
}
