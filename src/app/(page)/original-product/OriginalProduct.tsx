"use client";

import { endpoint } from "@/constant/endpoint";
import { Card, Carousel, Col, Flex, Image, Input, message, Row, Typography } from "antd";
import Meta from "antd/es/card/Meta";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Product } from "../convert-file/ConvertFile";
import { debounce } from "lodash";
import Container from "@/components/commons/Container";
import { useSession } from "next-auth/react";
import { CopyOutlined } from "@ant-design/icons";

const { Text } = Typography;
interface Result extends Product {
  createdAt: string;
}
function OriginalProduct() {
  const { data: session } = useSession();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result[]>([]);

  const searchProducts = async (keyword: string) => {
    if (!keyword) {
      setResult([]);
      return;
    }
    setLoading(true);
    try {
      const email = session?.user?.email;
      const { data } = await axios.get<Result[]>(endpoint.productData, {
        params: { name: keyword, email },
      });

      setResult(data.slice(0, 100));
    } catch (error) {
      console.error("Error fetching product data: ", error);
    } finally {
      setLoading(false);
    }
  };

  const searchProductsDebounced = useMemo(() => {
    return debounce((value: string) => {
      searchProducts(value);
    }, 500);
  }, []);

  useEffect(() => {
    searchProductsDebounced(keyword);

    return () => {
      searchProductsDebounced.cancel();
    };
  }, [keyword, searchProductsDebounced]);

  return (
    <>
      <Container title="Original Product">
        <Card>
          <Input
            placeholder="Search product by name"
            size="large"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </Card>
      </Container>
      <Row gutter={[16, 16]}>
        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : (
          result.map((product, index) => (
            <Col
              xl={{ span: 4 }}
              md={{ span: 8 }}
              xs={{ span: 12 }}
              key={product.key + index}
            >
              <Card
                style={{ maxWidth: 240 }}
                cover={
                  <Carousel>
                    {product.Images.split(",").map((image, index) => (
                      <Image src={image} alt={product.Name} key={index} />
                    ))}
                  </Carousel>
                }
              >
                <Meta description={<Text>{product.Name}</Text>} />
                <Meta
                  description={
                    <Text type="secondary">
                      {product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString(
                            "vi-VN",
                          )
                        : ""}
                        &nbsp;
                        <CopyOutlined onClick={()=> navigator.clipboard.writeText(product.Link).then(() => message.success('Copy successfully'))}/>
                    </Text>
                  }
                />
              </Card>
            </Col>
          ))
        )}
      </Row>
    </>
  );
}

export default OriginalProduct;
