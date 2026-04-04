"use client";

import { useCategories } from "@/app/hooks/useCategories";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import useDebounce from "@/app/hooks/useDebounce";
import { useGlobalCateKeywordConfig } from "@/app/hooks/useGlobalCateKeywordConfig";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import Container from "@/components/commons/Container";
import CateKeywordConfig from "@/components/convert-file/CateKeywordConfig";
import DuplicatedChecker from "@/components/convert-file/DuplicatedChecker";
import ExcludeSizeChartLink from "@/components/convert-file/ExcludeSizeChartLink";
import ProductItem from "@/components/convert-file/ProductItem";
import { endpoint } from "@/constant/endpoint";
import { normFile } from "@/helper/common";
import detectCategory from "@/helper/detect-category";
import { handleDownloadFile } from "@/helper/woo";
import { DownloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Switch,
  Typography,
  Upload,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useMediaQuery } from "usehooks-ts";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
export const CONVERT_DATA = "CONVERT_DATA";
export interface Product {
  key: string;
  Name: string;
  Images: string;
  Categories: string;
}
function ConvertFile() {
  const { data: session } = useSession();
  const matches = useMediaQuery("(min-width: 992px)");
  const [form] = Form.useForm();
  const [products, setProducts] = useLocalStorage<Product[]>(CONVERT_DATA, []);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [uploadAble, setUploadable] = useState(true);
  const { cateKeyword, isLoading: cateKeywordLoading } =
    useGlobalCateKeywordConfig();
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite(
    session?.user?.email || "",
  );
  const { categories, isLoading: categoriesLoading } = useCategories();
  const watchShopId = Form.useWatch("website", form);
  const [searchProduct, setSearchProduct] = useState<Product[] | null>(null);
  const debounceProducts: Product[] = useDebounce(newProducts, 400);
  const categoriesOptions = useMemo(() => {
    const categoriesByShop = categories?.filter(
      (category) => category.shopID === watchShopId,
    );
    if (!categoriesByShop) return [];
    return categoriesByShop.map((category) => ({
      label: category.category,
      value: category.category,
    }));
  }, [categories, watchShopId]);

  const websiteOptions = useMemo(() => {
    if (!websiteConfigList) return [];
    return websiteConfigList.map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [websiteConfigList]);

  const beforeUploadFile = async (file: any) => {
    setNewProducts([]);
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: "array",
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const productsData: Product[] = XLSX.utils.sheet_to_json(worksheet);

    const formattedProduct: Product[] = [];
    for (let i = 0; i < productsData.length; i++) {
      if (!productsData[i]?.Name || !productsData[i]?.Images) {
        continue;
      }
      formattedProduct.push({
        key: file.uid + i,
        Name: productsData[i].Name,
        Images: productsData[i].Images.replace(/,+$/, ""),
        Categories:
          productsData[i]?.Categories ||
          detectCategory(productsData[i].Name, cateKeyword),
      });
    }
    setNewProducts((prev) => [...prev, ...formattedProduct]);
  };

  const handleNameChange = (productKey: string, value: string) => {
    const newProducts = products.map((product) =>
      product.key === productKey ? { ...product, Name: value } : product,
    );
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.map((product) =>
      product.key === productKey ? { ...product, Name: value } : product,
    );
    setSearchProduct(newSearchProduct || null);
  };

  const handleCategoryChange = (productKey: string, value: string) => {
    const newProducts = products.map((product) => {
      return product.key === productKey
        ? { ...product, Categories: value }
        : product;
    });
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.map((product) => {
      return product.key === productKey
        ? { ...product, Categories: value }
        : product;
    });
    setSearchProduct(newSearchProduct || null);
  };

  const handleImagesChange = (productKey: string, value: string) => {
    const newProducts = products.map((product) =>
      product.key === productKey ? { ...product, Images: value } : product,
    );
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.map((product) =>
      product.key === productKey ? { ...product, Images: value } : product,
    );
    setSearchProduct(newSearchProduct || null);
  };

  const handleDelete = (productKey: string) => {
    const newProducts = products.filter(
      (product) => product.key !== productKey,
    );
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.filter(
      (product) => product.key !== productKey,
    );
    setSearchProduct(newSearchProduct || null);
  };

  const handleDuplicateRow = (productKey: string) => {
    const index = products.findIndex((product) => product.key === productKey);
    const newProducts = [
      ...products.slice(0, index + 1),
      {
        ...products[index],
        key: products[index].key + Date.now(),
      },
      ...products.slice(index + 1),
    ];
    setProducts(newProducts);
  };

  const handleSearch = (value: string) => {
    const newProducts = products.filter(
      (product) =>
        product.Name.toLowerCase().includes(value.toLowerCase()) ||
        product.Categories.toLowerCase().includes(value.toLowerCase()),
    );
    setSearchProduct(newProducts);
  };

  const uploadProductsToServer = async (products: Product[]) => {
    try {
      const productsWithDate = products.map((p) => ({
        ...p,
        uploadedAt: new Date().toISOString(),
      }));
      const res = await axios.post(endpoint.productData, productsWithDate);
      if (res.status === 200) {
        message.success("Products uploaded successfully");
      }
    } catch (error) {
      console.error(error);
      message.error("Error uploading products");
    }
  };

  const handleCheckDuplicate = () => {
    const getDuplicateNames = (products: Product[]) => {
      const nameMap: Record<string, number> = {};
      products.forEach((product) => {
        const normalizedName = product.Name.trim().toLowerCase();
        nameMap[normalizedName] = (nameMap[normalizedName] || 0) + 1;
      });
      return Object.keys(nameMap).filter((name) => nameMap[name] > 1);
    };
    const duplicateNames = getDuplicateNames(products);
    if (duplicateNames.length > 0) {
      message.error(duplicateNames[0]);
      return;
    } else {
      message.success("No duplicate names found");
    }
  };
  const handleSubmit = async () => {
    const isCategoryValid = products.every((product) => product.Categories);
    if (!isCategoryValid) {
      message.error("Please fill all category");
      return;
    }
    handleDownloadFile(products, "Converted");
    if (uploadAble) {
      await uploadProductsToServer(products);
    }
  };

  useEffect(() => {
    if (debounceProducts.length === 0) return;
    setProducts([...products, ...debounceProducts]);
  }, [debounceProducts]);

  useEffect(() => {
    form.setFieldValue("website", websiteOptions[0]?.value);
  }, [websiteOptions]);

  return (
    <div>
      <Container title="Display File Data">
        <Card>
          <Form name="initial-file" layout="vertical" form={form}>
            {(categoriesLoading || websiteLoading || cateKeywordLoading) && (
              <Spin
                size="large"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  zIndex: 100,
                  transform: "translateX(-50%)",
                }}
              />
            )}
            <Row gutter={16}>
              <Col span={24} sm={{ span: 12 }}>
                <Form.Item
                  name="website"
                  label={
                    <>
                      Website &nbsp;
                      {watchShopId ? (
                        <CateKeywordConfig
                          categoriesOptions={categoriesOptions.map(
                            (item) => item.value,
                          )}
                        />
                      ) : null}
                    </>
                  }
                  rules={[
                    {
                      required: true,
                      message: "Please select for website!",
                    },
                  ]}
                >
                  <Select
                    placeholder="Select Website"
                    options={websiteOptions}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={24} sm={{ span: 12 }}>
                <Form.Item
                  name="file"
                  valuePropName="fileList"
                  label="File"
                  getValueFromEvent={normFile}
                  rules={[{ required: true, message: "Please upload file!" }]}
                >
                  <Upload
                    style={{ width: "100%" }}
                    multiple
                    beforeUpload={beforeUploadFile}
                  >
                    <Button block>Upload file excel</Button>
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="search">
              <Input
                placeholder="Search"
                style={{ marginBottom: 16 }}
                allowClear
                onChange={(e) => {
                  handleSearch(e.target.value);
                }}
              />
            </Form.Item>
          </Form>
        </Card>
      </Container>
      {products.length > 0 && (
        <>
          <Flex justify="space-between" style={{ marginBottom: 16 }}>
            <DuplicatedChecker
              products={products}
              handleDelete={handleDelete}
            />
            {products.length} items
            <ExcludeSizeChartLink
              products={products}
              setProducts={setProducts}
            />
            <Button
              danger
              onClick={() => setProducts([])}
              style={{ marginLeft: 16 }}
            >
              Clear All
            </Button>
          </Flex>
          <List
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: 4,
            }}
            height={800}
            itemSize={matches ? 127 : 252}
            itemCount={searchProduct ? searchProduct.length : products.length}
            overscanCount={5}
            itemData={{
              products: searchProduct || products,
              handleNameChange,
              handleCategoryChange,
              handleDelete,
              categoriesOptions,
              handleImagesChange,
              handleDuplicateRow,
              setProducts,
            }}
            width={"100%"}
          >
            {ProductItem}
          </List>

          <Flex gap={16} align="center" justify="space-between">
            <div>
              <Text>Upload to server: </Text>
              <Switch value={uploadAble} onChange={(e) => setUploadable(e)} />
            </div>
            <Button type="primary" onClick={handleCheckDuplicate}>
              Check duplicate
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleSubmit}
              style={{ marginTop: 16 }}
            >
              Download ({products.length} items)
            </Button>
          </Flex>
        </>
      )}
    </div>
  );
}

export default ConvertFile;
