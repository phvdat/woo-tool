"use client";
import Container from "@/components/commons/Container";
import CrawlListProductUrl from "@/components/crawl-tool/CrawlListProductUrl";
import CrawlMixedProductDetail from "@/components/crawl-tool/CrawlMixedProductDetail";
import SelectorSetup from "@/components/crawl-tool/SelectorSetup";
import { Card, Carousel, Divider, Segmented } from "antd";
import { useRef, useState } from "react";

const TOOL_OPTIONS = {
  CRAWL_MIXED_PRODUCTS_DETAIL: "Crawl Mixed Products Detail",
  CRAWL_LIST_PRODUCT_URL: "Crawl List Product URL",
  SELECTOR_SETUP: "Selector Setup",
};

function CrawlTool() {
  const carouselRef = useRef<any>(null);
  const [option, setOption] = useState(
    TOOL_OPTIONS.CRAWL_MIXED_PRODUCTS_DETAIL,
  );

  const handleChangeTool = (value: string) => {
    setOption(value);
    switch (value) {
      case TOOL_OPTIONS.CRAWL_MIXED_PRODUCTS_DETAIL:
        carouselRef.current?.goTo(0);
        break;
      case TOOL_OPTIONS.CRAWL_LIST_PRODUCT_URL:
        carouselRef.current?.goTo(1);
        break;
      case TOOL_OPTIONS.SELECTOR_SETUP:
        carouselRef.current?.goTo(2);
        break;
      default:
        break;
    }
  };

  return (
    <Container
      title="Crawl Tool"
      subtitle="Extract product data from websites"
      size="lg"
    >
      <Card>
        <Segmented
          options={Object.values(TOOL_OPTIONS)}
          block
          value={option}
          onChange={handleChangeTool}
          size="large"
        />
        <Divider style={{ margin: "16px 0" }} />
        <Carousel ref={carouselRef} dots={false}>
          <div>
            <CrawlMixedProductDetail />
          </div>
          <div>
            <CrawlListProductUrl />
          </div>
          <div>
            <SelectorSetup />
          </div>
        </Carousel>
      </Card>
    </Container>
  );
}

export default CrawlTool;
