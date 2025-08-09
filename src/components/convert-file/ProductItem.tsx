'use client';
import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { convertToAcronym } from '@/helper/common';
import {
  DeleteOutlined,
  EditOutlined,
  RollbackOutlined,
  SplitCellsOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Divider,
  Flex,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
} from 'antd';
import { isNumber, set } from 'lodash';
import React, { useState } from 'react';
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
  };
  index: number;
  style: any;
}
const ProductItem = function ProductItem({
  data: {
    handleNameChange,
    handleCategoryChange,
    handleImagesChange,
    handleDelete,
    categoriesOptions,
    products,
    handleDuplicateRow,
    setProducts,
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
  const handleSplitter = (key: string, productSplit: number) => {
    const newProducts: any[] = [];

    products.forEach((product) => {
      if (product.key === key) {
        const imageArray = product.Images.split(',');
        const totalChunks = Math.ceil(imageArray.length / productSplit);

        for (let i = 0; i < totalChunks; i++) {
          const chunk = imageArray.slice(
            i * productSplit,
            (i + 1) * productSplit
          );
          const newProduct = {
            ...product,
            Images: chunk.join(','),
            key: `${product.key}-${i}}`,
          };
          newProducts.push(newProduct);
        }
      } else {
        newProducts.push(product);
      }
    });

    setProducts(newProducts);
  };

  return (
    <div
      style={{ ...style, border: '1px solid #ccc', overflowY: 'auto' }}
      key={currentProduct.key}
    >
      <Row
        style={{
          width: '100%',
        }}
      >
        <Col span={24} lg={{ span: 8 }} style={{ padding: 12 }}>
          <Flex style={{ width: '100%' }} gap={12} wrap>
            <Select
              value={currentProduct.Categories}
              placeholder='Select Category'
              onChange={(value) =>
                handleCategoryChange(currentProduct.key, value)
              }
              options={categoriesOptions}
              showSearch
              suffixIcon={
                <RollbackOutlined
                  autoCapitalize=''
                  onClick={setPrevCategory}
                  style={{
                    fontSize: '20px',
                    padding: '2px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              }
              style={{ flex: 3 }}
              filterOption={(input, option: any) => {
                const searchFull = (option?.label ?? '')
                  ?.toLowerCase()
                  .includes(input.toLowerCase());
                const searchAcronym = convertToAcronym(
                  option?.label ?? ''
                ).includes(input.toLowerCase());
                return searchFull || searchAcronym;
              }}
            ></Select>

            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(currentProduct.key)}
              tabIndex={-1}
            >
              Xoá
            </Button>

            <Input.TextArea
              placeholder='Product Name'
              rows={2}
              value={currentProduct.Name}
              onChange={(e) =>
                handleNameChange(currentProduct.key, e.target.value)
              }
              style={{ width: '100%' }}
            />
          </Flex>
        </Col>
        <Col span={24} lg={{ span: 16 }} style={{ padding: 12 }}>
          <Flex gap={12} wrap justify='space-between'>
            {isEdit ? (
              <Input.TextArea
                placeholder='Image Urls'
                rows={4}
                value={currentProduct.Images.replaceAll(',', '\n')}
                style={{ width: '100%' }}
                onChange={(e) =>
                  handleImagesChange(
                    currentProduct.key,
                    e.target.value.replaceAll('\n', ',').replaceAll(' ', '')
                  )
                }
                onBlur={() => setIsEdit(false)}
              />
            ) : (
              <Flex gap={12} wrap>
                {currentProduct.Images?.split(',').map(
                  (img: string, idx: number) => (
                    <Image
                      src={img}
                      width={100}
                      height={100}
                      key={idx}
                      alt='product'
                      loading='lazy'
                    />
                  )
                )}
              </Flex>
            )}
            <Flex gap={4} wrap>
              <Button onClick={() => setIsEdit((prev) => !prev)}>
                <EditOutlined />
              </Button>
              <Button onClick={() => handleDuplicateRow(currentProduct.key)}>
                Dup
              </Button>
              <div>
                <InputNumber
                  placeholder='Split'
                  addonAfter={
                    <SplitCellsOutlined
                      onClick={() =>
                        isNumber(productSplit) &&
                        handleSplitter(currentProduct.key, productSplit)
                      }
                    />
                  }
                  onChange={(value) => setProductSplit(value as number)}
                  value={productSplit}
                  style={{ width: '90px' }}
                />
              </div>
            </Flex>
          </Flex>
        </Col>
      </Row>
    </div>
  );
};

export default ProductItem;
