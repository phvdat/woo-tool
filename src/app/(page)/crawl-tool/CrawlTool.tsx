'use client';
import CrawlListProductUrl from '@/components/crawl-tool/CrawlListProductUrl';
import CrawlProductDetail from '@/components/crawl-tool/CrawProductDetail';
import { Carousel, Divider, Segmented, Slider } from 'antd';
import { useRef, useState } from 'react';

const TOOL_OPTIONS = {
  CRAW_LIST_PRODUCT_URL: 'Crawl List Product URL',
  CRAW_PRODUCTS_DETAIL: 'Crawl Products Detail',
};

function CrawlTool() {
  const carouselRef = useRef<any>(null);
  const [option, setOption] = useState(TOOL_OPTIONS.CRAW_LIST_PRODUCT_URL);

  const handleChangeTool = (value: string) => {
    setOption(value);
    if (value === TOOL_OPTIONS.CRAW_LIST_PRODUCT_URL) {
      carouselRef.current?.goTo(0);
    } else {
      carouselRef.current?.goTo(1);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <h1>Product Info Scraper</h1>
      <Segmented
        options={[
          TOOL_OPTIONS.CRAW_LIST_PRODUCT_URL,
          TOOL_OPTIONS.CRAW_PRODUCTS_DETAIL,
        ]}
        block
        value={option}
        onChange={handleChangeTool}
      />
      <Divider />
      <Carousel ref={carouselRef}>
        <div>
          <CrawlListProductUrl />
        </div>
        <div>
          <CrawlProductDetail />
        </div>
      </Carousel>
    </div>
  );
}

export default CrawlTool;
