"use client";

import { useCategories } from "@/app/hooks/useCategories";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import useDebounce from "@/app/hooks/useDebounce";
import { useGlobalCateKeywordConfig } from "@/app/hooks/useGlobalCateKeywordConfig";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import Container from "@/components/commons/Container";
import CateKeywordConfig from "@/components/convert-file/CateKeywordConfig";
import ExcludeSizeChartLink from "@/components/convert-file/ExcludeSizeChartLink";
import ExistChecker from "@/components/convert-file/ExistChecker";
import ProductItem from "@/components/convert-file/ProductItem";
import { endpoint } from "@/constant/endpoint";
import { normFile, upscaleImage } from "@/helper/common";
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
  Radio,
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

const { Text } = Typography;
export const CONVERT_DATA = "CONVERT_DATA";
export interface Product {
  key: string;
  Name: string;
  Images: string;
  Categories: string;
  Link: string;
}
function ConvertFile() {
  const { data: session } = useSession();
  const matches = useMediaQuery("(min-width: 992px)");
  const [form] = Form.useForm();

  const [products, setProducts] = useLocalStorage<Product[]>(CONVERT_DATA, []);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [uploadAble, setUploadable] = useState(true);
  const [mergeSourceKey, setMergeSourceKey] = useState<string | null>(null);

  const { cateKeyword, isLoading: cateKeywordLoading } =
    useGlobalCateKeywordConfig();
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite(
    session?.user?.email || "",
  );
  const watchShopId = Form.useWatch("website", form);
  const { categories, isLoading: categoriesLoading } =
    useCategories(watchShopId);
  const [searchProduct, setSearchProduct] = useState<Product[] | null>(null);
  const debounceProducts: Product[] = useDebounce(newProducts, 400);
  const categoriesOptions = useMemo(() => {
    if (!categories) return [];
    return categories.map((category) => ({
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

  const categoryOptions: string[] = [
    "All Cate",
    ...Array.from(
      new Set(
        products.map((product) =>
          product.Categories?.trim() ? product.Categories : "Missing Cate",
        ),
      ),
    ).sort((a, b) => {
      if (a === "Missing Cate") return -1;
      if (b === "Missing Cate") return 1;
      const cateA = a.split(">").pop()?.trim() || "";
      const cateB = b.split(">").pop()?.trim() || "";
      return cateA.localeCompare(cateB);
    }),
  ];

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
        Images: upscaleImage(productsData[i].Images.replace(/,+$/, "")),
        Categories:
          productsData[i]?.Categories ||
          detectCategory(productsData[i].Name, cateKeyword),
        Link: productsData[i].Link,
      });
    }
    setNewProducts((prev) => [...prev, ...formattedProduct]);
  };

  const updateBoth = (updater: (list: Product[]) => Product[]) => {
    setProducts((prev) => updater(prev));
    setSearchProduct((prev) => (prev ? updater(prev) : prev));
  };

  const handleNameChange = (productKey: string, value: string) => {
    updateBoth((list) =>
      list.map((p) => (p.key === productKey ? { ...p, Name: value } : p)),
    );
  };

  const handleCategoryChange = (productKey: string, value: string) => {
    updateBoth((list) =>
      list.map((p) => (p.key === productKey ? { ...p, Categories: value } : p)),
    );
  };

  const handleImagesChange = (productKey: string, value: string) => {
    updateBoth((list) =>
      list.map((p) => (p.key === productKey ? { ...p, Images: value } : p)),
    );
  };

  const handleDelete = (productKey: string) => {
    updateBoth((list) => list.filter((p) => p.key !== productKey));
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

  const handleSplitProduct = (key: string, splitCount: number) => {
    setProducts((prev) => {
      const newList: Product[] = [];
      prev.forEach((product) => {
        if (product.key === key) {
          const imageArray = product.Images.split(",");
          const totalChunks = Math.ceil(imageArray.length / splitCount);
          for (let i = 0; i < totalChunks; i++) {
            const chunk = imageArray.slice(
              i * splitCount,
              (i + 1) * splitCount,
            );
            newList.push({
              ...product,
              Images: chunk.join(","),
              key: `${product.key}-${i}`,
            });
          }
        } else {
          newList.push(product);
        }
      });
      return newList;
    });
    setSearchProduct(null);
  };

  const handleMergeProduct = (targetKey: string) => {
    if (!mergeSourceKey || mergeSourceKey === targetKey) {
      setMergeSourceKey(null);
      return;
    }
    updateBoth((list) => {
      let sourceProduct = list.find((p) => p.key === mergeSourceKey);
      let targetProduct = list.find((p) => p.key === targetKey);
      if (!sourceProduct || !targetProduct) return list;
      const mergedImages = [
        ...sourceProduct.Images.split(","),
        ...targetProduct.Images.split(","),
      ];
      return list
        .map((p) => {
          if (p.key === mergeSourceKey) {
            return {
              ...p,
              Images: Array.from(new Set(mergedImages)).join(","),
            };
          }
          return p;
        })
        .filter((p) => p.key !== targetKey);
    });
    setMergeSourceKey(null);
  };

  const handleSearch = (value: string) => {
    if (!value) {
      setSearchProduct(null);
      return;
    }
    const newProducts = products.filter(
      (product) =>
        product.Name.toLowerCase().includes(value.toLowerCase()) ||
        product.Categories.toLowerCase().includes(value.toLowerCase()),
    );
    setSearchProduct(newProducts);
  };

  const uploadProductsToServer = async (products: Product[]) => {
    try {
      const email = session?.user?.email;

      if (!email) {
        message.error("Missing user email");
        return;
      }

      const payload = products.map((p) => ({
        ...p,
        email,
        createdAt: new Date(),
      }));
      const res = await axios.post(endpoint.productData, payload);
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
      form.setFieldValue("search", duplicateNames[0]);
      handleSearch(duplicateNames[0]);
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
                allowClear
                onChange={(e) => {
                  handleSearch(e.target.value);
                }}
              />
            </Form.Item>
            <Radio.Group
              options={categoryOptions}
              optionType="button"
              onChange={(e) => {
                const value = e.target.value;
                setSearchProduct(
                  products.filter((p) => {
                    if (value === "All Cate") return true;
                    const category = p.Categories?.trim()
                      ? p.Categories
                      : "Missing Cate";
                    return category === value;
                  }),
                );
              }}
            />
          </Form>
        </Card>
      </Container>
      {products.length > 0 && (
        <>
          <Flex justify="space-between" style={{ marginBottom: 16 }}>
            <ExistChecker products={products} handleDelete={handleDelete} />
            <Button type="primary" onClick={handleCheckDuplicate}>
              Check duplicate
            </Button>
            <ExcludeSizeChartLink
              products={products}
              setProducts={setProducts}
            />
            <Button
              danger
              onClick={() => setProducts([])}
              style={{ marginLeft: 16 }}
            >
              Clear All {products.length} items
            </Button>
          </Flex>
          <List
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: 4,
            }}
            height={800}
            itemSize={matches ? 127 : 310}
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
              mergeSourceKey,
              setMergeSourceKey,
              handleMergeProduct,
              handleSplitProduct,
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
