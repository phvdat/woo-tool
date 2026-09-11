"use client";

import { endpoint } from "@/constant/endpoint";
import Container from "@/components/commons/Container";
import {
  Card,
  Carousel,
  Col,
  Empty,
  Flex,
  Image,
  Input,
  Row,
  Skeleton,
  Typography,
} from "antd";
import Meta from "antd/es/card/Meta";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Product } from "../convert-file/ConvertFile";
import { debounce } from "lodash";
import { useSession } from "next-auth/react";
import { CopyOutlined, LinkOutlined, SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;
interface Result extends Product {
  createdAt: string;
}
function OriginalProduct() {
  const { data: session } = useSession();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result[]>([]);

  const searchProductsDebounced = useMemo(() => {
    return debounce(async (value: string, email: string | null | undefined) => {
      if (!value) {
        setResult([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await axios.get<Result[]>(endpoint.productData, {
          params: { name: value, email },
        });
        setResult(data.slice(0, 100));
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    searchProductsDebounced(keyword, session?.user?.email);

    return () => {
      searchProductsDebounced.cancel();
    };
  }, [keyword, searchProductsDebounced]);

  return (
    <Container
      title="Original Products"
      subtitle="Search and view your uploaded products"
      size="lg"
    >
      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search product by name..."
          size="large"
          prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
        />
      </Card>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xl={{ span: 4 }} md={{ span: 8 }} xs={{ span: 12 }} key={i}>
              <Card>
                <Skeleton.Image active style={{ width: "100%", height: 200 }} />
                <Skeleton active paragraph={{ rows: 1 }} style={{ marginTop: 16 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : result.length > 0 ? (
        <Row gutter={[16, 16]}>
          {result.map((product, index) => (
            <Col
              xl={{ span: 4 }}
              md={{ span: 8 }}
              xs={{ span: 12 }}
              key={product.key + index}
            >
              <Card
                hoverable
                cover={
                  <Carousel autoplay>
                    {product.Images.split(",").map((image, index) => (
                      <Image src={image} alt={product.Name} key={index} />
                    ))}
                  </Carousel>
                }
              >
                <Meta
                  description={
                    <Text ellipsis style={{ fontSize: 13 }}>
                      {product.Name}
                    </Text>
                  }
                />
                <Meta
                  description={
                    <Flex justify="space-between" align="center">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString("vi-VN")
                          : ""}
                      </Text>
                      {product?.Link && (
                        <a href={product.Link} target="_blank" rel="noopener noreferrer">
                          <LinkOutlined />
                        </a>
                      )}
                    </Flex>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          description={
            keyword
              ? <Text type="secondary">No products found for &quot;{keyword}&quot;</Text>
              : <Text type="secondary">Type a keyword to search products</Text>
          }
        />
      )}
    </Container>
  );
}

export default OriginalProduct;
