'use client';

import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import { normFile } from '@/helper/common';
import { handleDownloadFile } from '@/helper/woo';
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Col, Form, Row, Select, Spin, Upload } from 'antd';
import { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useMediaQuery } from 'usehooks-ts';
import * as XLSX from 'xlsx';
import ProductItem from './ProductItem';

const CONVERT_DATA = 'CONVERT_DATA';
export interface Product {
  key: number;
  Name: string;
  Images: string;
  Categories: string;
}
function ConvertFile() {
  const matches = useMediaQuery('(min-width: 992px)');
  const [form] = Form.useForm();
  const [products, setProducts] = useLocalStorage<Product[]>(CONVERT_DATA, []);
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const watchShopId = Form.useWatch('website', form);

  const categoriesOptions = useMemo(() => {
    const categoriesByShop = categories?.filter(
      (category) => category.shopID === watchShopId
    );
    if (!categoriesByShop) return [];
    return categoriesByShop.map((category) => ({
      label: category.templateName,
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
  const beforeUploadTrackingFile = async (file: any) => {
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const productsData = XLSX.utils.sheet_to_json(worksheet);

    const formatted = productsData.map((row: any, index) => ({
      key: file.uid + index,
      Name: row.Name,
      Images: row.Images,
      Categories: row?.Categories || '',
    }));
    setProducts([...products, ...formatted]);
  };

  const handleNameChange = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].Name = value;
    setProducts(newProducts);
  };

  const handleCategoryChange = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].Categories = value;
    setProducts(newProducts);
  };

  const handleImagesChange = (index: number, value: string) => {
    const newProducts = [...products];
    newProducts[index].Images = value;
    setProducts(newProducts);
  };

  const handleDelete = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    setProducts(newProducts);
  };

  return (
    <div
      style={{
        margin: '20px auto',
      }}
    >
      <h1>Convert File</h1>
      <Form name='initial-file' layout='vertical' form={form}>
        {(categoriesLoading || websiteLoading) && (
          <Spin
            size='large'
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 100,
              transform: 'translateX(-50%)',
            }}
          />
        )}
        <Row gutter={16}>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item
              name='website'
              label='Website'
              rules={[
                {
                  required: true,
                  message: 'Please select for website!',
                },
              ]}
            >
              <Select
                placeholder='Select Website'
                options={websiteOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item
              name='file'
              valuePropName='fileList'
              label='File'
              getValueFromEvent={normFile}
              rules={[{ required: true, message: 'Please upload file!' }]}
            >
              <Upload
                style={{ width: '100%' }}
                multiple
                beforeUpload={beforeUploadTrackingFile}
              >
                <Button block>Upload file excel</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {products.length > 0 && (
        <>
          <List
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
            height={800}
            itemSize={matches ? 124 : 248}
            itemCount={products.length}
            overscanCount={5}
            itemData={{
              products: products,
              handleNameChange,
              handleCategoryChange,
              handleDelete,
              categoriesOptions,
              handleImagesChange,
            }}
            width={'100%'}
          >
            {ProductItem}
          </List>
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            onClick={() => {
              handleDownloadFile(products, 'Converted');
            }}
            style={{ marginTop: 16 }}
          >
            Download ({products.length} items)
          </Button>
          <Button
            danger
            onClick={() => setProducts([])}
            style={{ marginLeft: 16 }}
          >
            Clear All
          </Button>
        </>
      )}
    </div>
  );
}

export default ConvertFile;
