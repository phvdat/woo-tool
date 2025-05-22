'use client';
import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { convertToAcronym } from '@/helper/common';
import {
  DeleteOutlined,
  EditOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Button, Col, Divider, Flex, Image, Input, Row, Select } from 'antd';
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
  },
  index,
  style,
}: ProductItemProps) {
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const currentProduct = products[index];
  const setPrevCategory = () => {
    const prevProduct = products[index - 1];
    const prevCategory = prevProduct?.Categories || currentProduct.Categories;
    handleCategoryChange(currentProduct.key, prevCategory);
  };

  return (
    <div
      style={{ ...style, overflowY: 'auto', border: '1px solid #ccc' }}
      key={currentProduct.key}
    >
      <Row
        style={{
          width: '100%',
        }}
      >
        <Col span={24} lg={{ span: 12 }} style={{ padding: 12 }}>
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
        <Col span={24} lg={{ span: 12 }} style={{ padding: 12 }}>
          <Flex gap={12} wrap>
            {isEdit ? (
              <Input.TextArea
                placeholder='Image Urls'
                rows={4}
                value={currentProduct.Images.replaceAll(',', '\n')}
                style={{ width: '100%' }}
                onChange={(e) =>
                  handleImagesChange(
                    currentProduct.key,
                    e.target.value.replaceAll('\n', ',')
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
            <Button onClick={() => setIsEdit((prev) => !prev)}>
              <EditOutlined />
            </Button>
            <Button onClick={() => handleDuplicateRow(currentProduct.key)}>
              Duplicate
            </Button>
          </Flex>
        </Col>
      </Row>
    </div>
  );
};

export default ProductItem;
