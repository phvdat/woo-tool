"use client";

import { endpoint } from "@/constant/endpoint";
import { Card, Carousel, Col, Flex, Image, Input, Row, Typography } from "antd";
import Meta from "antd/es/card/Meta";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Product } from "../convert-file/ConvertFile";
import { debounce } from "lodash";
import Container from "@/components/commons/Container";

const { Text } = Typography;

function OriginalProduct() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Product[]>([]);

  const searchProducts = async (keyword: string) => {
    if (!keyword) {
      setResult([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.get<Product[]>(endpoint.productData, {
        params: { name: keyword },
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
      searchProductsDebounced.cancel(); // cleanup
    };
  }, [keyword, searchProductsDebounced]);

  return (
    <>
      <Container title="Original Product">
        <Input
          placeholder="Search product by name"
          size="large"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
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
              </Card>
            </Col>
          ))
        )}
      </Row>
    </>
  );
}

export default OriginalProduct;
