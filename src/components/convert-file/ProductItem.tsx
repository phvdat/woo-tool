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
    handleNameChange: (index: number, value: string) => void;
    handleCategoryChange: (index: number, value: string) => void;
    handleDelete: (productKey: string) => void;
    categoriesOptions: any;
    products: Product[];
    handleImagesChange: (index: number, value: string) => void;
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
  },
  index,
  style,
}: ProductItemProps) {
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const setPrevCategory = () => {
    const prevCategory =
      products[index - 1]?.Categories || products[index]?.Categories;
    handleCategoryChange(index, prevCategory);
  };

  return (
    <div style={style} key={products[index].key}>
      <Row
        style={{
          width: '100%',
        }}
      >
        <Col span={24} lg={{ span: 12 }} style={{ padding: 12 }}>
          <Flex style={{ width: '100%' }} gap={12} wrap>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(products[index].key)}
              style={{ flex: 1 }}
              tabIndex={-1}
            >
              Xoá
            </Button>

            <Select
              value={products[index].Categories}
              placeholder='Select Category'
              onChange={(value) => handleCategoryChange(index, value)}
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
                console.log(convertToAcronym(option?.label ?? ''));
                return searchFull || searchAcronym;
              }}
            ></Select>
            <Input.TextArea
              placeholder='Product Name'
              rows={2}
              value={products[index].Name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              style={{ width: '100%' }}
            />
          </Flex>
        </Col>
        <Col span={24} lg={{ span: 12 }} style={{ padding: 12 }}>
          <Flex gap={12}>
            {isEdit ? (
              <Input.TextArea
                placeholder='Image Urls'
                rows={4}
                value={products[index].Images.replaceAll(',', '\n')}
                style={{ width: '100%' }}
                onChange={(e) =>
                  handleImagesChange(
                    index,
                    e.target.value.replaceAll('\n', ',')
                  )
                }
                onBlur={() => setIsEdit(false)}
              />
            ) : (
              <>
                {products[index].Images?.split(',').map(
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
                <EditOutlined onClick={() => setIsEdit((prev) => !prev)} />
              </>
            )}
          </Flex>
        </Col>
      </Row>
      <Divider style={{ margin: 0 }} />
    </div>
  );
};

export default ProductItem;
