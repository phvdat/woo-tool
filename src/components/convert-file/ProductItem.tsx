"use client";
import { Product } from "@/app/(page)/convert-file/ConvertFile";
import { convertToAcronym } from "@/helper/common";
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  MergeOutlined,
  PlusSquareOutlined,
  RollbackOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import {
  Button,
  Col,
  Flex,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
} from "antd";
import { isNumber } from "lodash";
import Link from "next/link";
import React, { useState } from "react";

interface ProductItemProps {
  data: {
    handleNameChange: (productKey: string, value: string) => void;
    handleCategoryChange: (productKey: string, value: string) => void;
    handleDelete: (productKey: string) => void;
    categoriesOptions: any;
    products: Product[];
    handleImagesChange: (productKey: string, value: string) => void;
    handleDuplicateRow: (productKey: string) => void;
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    mergeSourceKey: string | null;
    setMergeSourceKey: React.Dispatch<React.SetStateAction<string | null>>;
    handleMergeProduct: (productKey: string) => void;
    handleSplitProduct: (productKey: string, splitCount: number) => void;
  };
  index: number;
  style: any;
}

const ProductItem = React.memo(function ProductItem({
  data: {
    handleNameChange,
    handleCategoryChange,
    handleImagesChange,
    handleDelete,
    categoriesOptions,
    products,
    handleDuplicateRow,
    mergeSourceKey,
    setMergeSourceKey,
    handleMergeProduct,
    handleSplitProduct,
  },
  index,
  style,
}: ProductItemProps) {
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [productSplit, setProductSplit] = useState<number>();

  const currentProduct = products[index];

  const setPrevCategory = () => {
    const prevProduct = products[index - 1];
    const prevCategory = prevProduct?.Categories || currentProduct.Categories;
    handleCategoryChange(currentProduct.key, prevCategory);
  };

  return (
    <div
      style={{
        ...style,
        overflowY: "auto",
        border:
          currentProduct.key === mergeSourceKey
            ? "1px solid #41ff16"
            : "1px solid #ccc",
      }}
      key={currentProduct.key}
    >
      <Row
        style={{
          width: "100%",
        }}
      >
        <Col span={24} lg={{ span: 8 }} style={{ padding: "12px 4px" }}>
          <Flex style={{ width: "100%" }} gap={12} wrap justify="space-between">
            <Select
              value={currentProduct.Categories}
              placeholder="Select Category"
              onChange={(value) =>
                handleCategoryChange(currentProduct.key, value)
              }
              options={categoriesOptions}
              showSearch
              suffixIcon={
                <RollbackOutlined
                  autoCapitalize=""
                  onClick={setPrevCategory}
                  style={{
                    fontSize: "20px",
                    padding: "2px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              }
              style={{ minWidth: "215px" }}
              filterOption={(input, option: any) => {
                const searchFull = (option?.label ?? "")
                  ?.toLowerCase()
                  .includes(input.toLowerCase());
                const searchAcronym = convertToAcronym(
                  option?.label ?? "",
                ).includes(input.toLowerCase());
                return searchFull || searchAcronym;
              }}
            ></Select>

            <Link href={currentProduct.Link || ""} target="_blank">
              <Button>
                <LinkOutlined />
              </Button>
            </Link>
            <Button
              size={"small"}
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(currentProduct.key)}
              tabIndex={-1}
            ></Button>

            <Input.TextArea
              placeholder="Product Name"
              rows={2}
              value={currentProduct.Name}
              onChange={(e) =>
                handleNameChange(currentProduct.key, e.target.value)
              }
              style={{ width: "100%" }}
            />
          </Flex>
        </Col>
        <Col span={24} lg={{ span: 16 }} style={{ padding: "12px 4px" }}>
          <Flex>
            <div style={{ flex: 1 }}>
              {isEdit ? (
                <Input.TextArea
                  placeholder="Image Urls"
                  rows={4}
                  value={currentProduct.Images.replaceAll(",", "\n")}
                  style={{ width: "100%" }}
                  onChange={(e) =>
                    handleImagesChange(
                      currentProduct.key,
                      e.target.value.replaceAll("\n", ",").replaceAll(" ", ""),
                    )
                  }
                  onBlur={() => setIsEdit(false)}
                />
              ) : (
                <>
                  {currentProduct.Images?.split(",").map(
                    (img: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <Image
                          src={img}
                          width={100}
                          height={100}
                          alt="product"
                          loading="lazy"
                        />
                        <CloseOutlined
                          onClick={() => {
                            const newImages = currentProduct.Images.split(",")
                              .filter((_, i) => i !== idx)
                              .join(",");
                            handleImagesChange(currentProduct.key, newImages);
                          }}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    ),
                  )}
                </>
              )}
            </div>

            <Flex gap={4} wrap justify="space-around" style={{ maxWidth: 136 }}>
              <Button
                onClick={() => setIsEdit((prev) => !prev)}
                style={{ padding: "2px 8px" }}
              >
                <EditOutlined />
              </Button>
              <Button onClick={() => handleDuplicateRow(currentProduct.key)}>
                <PlusSquareOutlined />
              </Button>
              <Button
                type={
                  currentProduct.key === mergeSourceKey ? "primary" : "default"
                }
                onClick={() => {
                  if (!mergeSourceKey) {
                    setMergeSourceKey(currentProduct.key);
                  } else {
                    handleMergeProduct(currentProduct.key);
                  }
                }}
              >
                <MergeOutlined />
              </Button>
              <InputNumber
                placeholder="Split"
                addonAfter={
                  <ScissorOutlined
                    onClick={() =>
                      isNumber(productSplit) &&
                      handleSplitProduct(currentProduct.key, productSplit)
                    }
                  />
                }
                onChange={(value) => setProductSplit(value as number)}
                value={productSplit}
                style={{ width: "90px" }}
              />
            </Flex>
          </Flex>
        </Col>
      </Row>
    </div>
  );
});

export default ProductItem as React.MemoExoticComponent<React.FC<ProductItemProps>>;
