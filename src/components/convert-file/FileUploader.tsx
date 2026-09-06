"use client";

import { useCategories } from "@/app/hooks/useCategories";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import { useGlobalCateKeywordConfig } from "@/app/hooks/useGlobalCateKeywordConfig";
import CateKeywordConfig from "@/components/convert-file/CateKeywordConfig";
import {
  normFile,
  toCapitalizedCase,
  fixEncoding,
  upscaleImage,
} from "@/helper/common";
import detectCategory from "@/helper/detect-category";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Upload,
} from "antd";
import { useMemo } from "react";

export interface Product {
  key: string;
  Name: string;
  Images: string;
  Categories: string;
  Link?: string;
  [key: string]: any;
}

interface FileUploaderProps {
  form: any;
  products: Product[];
  onProductsLoaded: (products: Product[]) => void;
  onSearch: (value: string) => void;
  onCategoryFilter: (category: string) => void;
}

export default function FileUploader({
  form,
  products,
  onProductsLoaded,
  onSearch,
  onCategoryFilter,
}: FileUploaderProps) {
  const { cateKeyword, isLoading: cateKeywordLoading } =
    useGlobalCateKeywordConfig();
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite();
  const watchShopId = Form.useWatch("website", form);
  const { categories, isLoading: categoriesLoading } =
    useCategories(watchShopId);

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
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const productsData =
      XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

    const formattedProduct: Product[] = [];
    for (let i = 0; i < productsData.length; i++) {
      const row = productsData[i];
      if (!row?.Name || !row?.Images) continue;
      formattedProduct.push({
        ...row,
        key: `${file.uid}${i}`,
        Name: toCapitalizedCase(fixEncoding(String(row.Name))),
        Images: upscaleImage(String(row.Images).replace(/,+$/, "")),
        Categories: row.Categories || detectCategory(row.Name, cateKeyword),
      });
    }
    onProductsLoaded(formattedProduct);
  };

  return (
    <Card>
      <Form name="initial-file" layout="vertical" form={form}>
        {(categoriesLoading || websiteLoading || cateKeywordLoading) && (
          <div style={{ textAlign: "center", padding: 16 }}>Loading...</div>
        )}
        <Row gutter={16}>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item
              name="website"
              label={
                <>
                  Website &nbsp;
                  {watchShopId && (
                    <CateKeywordConfig
                      categoriesOptions={categoriesOptions.map(
                        (item) => item.value,
                      )}
                    />
                  )}
                </>
              }
              rules={[{ required: true, message: "Please select a website" }]}
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
              rules={[{ required: true, message: "Please upload a file" }]}
            >
              <Upload multiple beforeUpload={beforeUploadFile}>
                <Button block>Upload Excel file</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="search">
          <Input
            placeholder="Search products..."
            allowClear
            onChange={(e) => onSearch(e.target.value)}
          />
        </Form.Item>
        <Radio.Group
          options={categoryOptions}
          optionType="button"
          onChange={(e) => onCategoryFilter(e.target.value)}
        />
      </Form>
    </Card>
  );
}
