'use client';

import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import useDebounce from '@/app/hooks/useDebounce';
import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import CateKeywordConfig, {
  CATE_KEYWORD_LOCAL_KEY,
} from '@/components/convert-file/CateKeywordConfig';
import DuplicatedChecker from '@/components/convert-file/DuplicatedChecker';
import ProductItem from '@/components/convert-file/ProductItem';
import { endpoint } from '@/constant/endpoint';
import { normFile } from '@/helper/common';
import detectCategory from '@/helper/detect-category';
import { handleDownloadFile } from '@/helper/woo';
import { DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Flex,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Typography,
  Upload,
} from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useMediaQuery } from 'usehooks-ts';
import * as XLSX from 'xlsx';

const { Title } = Typography;
const CONVERT_DATA = 'CONVERT_DATA';
export interface Product {
  key: string;
  Name: string;
  Images: string;
  Categories: string;
}
function ConvertFile() {
  const matches = useMediaQuery('(min-width: 992px)');
  const [form] = Form.useForm();
  const [products, setProducts] = useLocalStorage<Product[]>(CONVERT_DATA, []);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [cateKeyword] = useLocalStorage<{
    [key: string]: string[];
  }>(CATE_KEYWORD_LOCAL_KEY, {});
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const watchShopId = Form.useWatch('website', form);
  const [searchProduct, setSearchProduct] = useState<Product[] | null>(null);
  const debounceProducts: Product[] = useDebounce(newProducts, 400);
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
    setNewProducts([]);
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const productsData = XLSX.utils.sheet_to_json(worksheet);
    const formatted = productsData.map((row: any, index) => ({
      key: file.uid + index,
      Name: row.Name,
      Images: row.Images,
      Categories: row?.Categories || detectCategory(row.Name, cateKeyword),
    }));
    setNewProducts((prev) => [...prev, ...formatted]);
  };

  const handleNameChange = (productKey: string, value: string) => {
    const newProducts = products.map((product) =>
      product.key === productKey ? { ...product, Name: value } : product
    );
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.map((product) =>
      product.key === productKey ? { ...product, Name: value } : product
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
      product.key === productKey ? { ...product, Images: value } : product
    );
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.map((product) =>
      product.key === productKey ? { ...product, Images: value } : product
    );
    setSearchProduct(newSearchProduct || null);
  };

  const handleDelete = (productKey: string) => {
    const newProducts = products.filter(
      (product) => product.key !== productKey
    );
    setProducts(newProducts);

    const newSearchProduct = searchProduct?.filter(
      (product) => product.key !== productKey
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
        product.Categories.toLowerCase().includes(value.toLowerCase())
    );
    setSearchProduct(newProducts);
  };

  const uploadProductsToServer = async (products: Product[]) => {
    try {
      const res = await axios.post(endpoint.productData, products);

      if (res.status === 200) {
        message.success('Products uploaded successfully');
      }
    } catch (error) {
      console.error(error);
      message.error('Error uploading products');
    }
  };
  const handleSubmit = async () => {
    const isCategoryValid = products.every((product) => product.Categories);
    if (!isCategoryValid) {
      message.error('Please fill all category');
      return;
    }
    handleDownloadFile(products, 'Converted');
    await uploadProductsToServer(products);
  };

  useEffect(() => {
    if (debounceProducts.length === 0) return;
    console.log('set to local');

    setProducts([...products, ...debounceProducts]);
  }, [debounceProducts]);

  return (
    <div
      style={{
        margin: '20px auto',
      }}
    >
      <Title level={4} style={{ textAlign: 'center' }}>
        Convert File &nbsp;
      </Title>
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
              label={
                <>
                  Website &nbsp;
                  {watchShopId ? (
                    <CateKeywordConfig
                      categoriesOptions={categoriesOptions.map(
                        (item) => item.value
                      )}
                    />
                  ) : null}
                </>
              }
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
        <Form.Item name='search' label='Search'>
          <Input
            placeholder='Search'
            style={{ marginBottom: 16 }}
            allowClear
            onChange={(e) => {
              handleSearch(e.target.value);
            }}
          />
        </Form.Item>
      </Form>
      {products.length > 0 && (
        <>
          <Flex justify='space-between' style={{ marginBottom: 16 }}>
            <DuplicatedChecker
              products={products}
              handleDelete={handleDelete}
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
              border: '1px solid #d9d9d9',
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
            }}
            width={'100%'}
          >
            {ProductItem}
          </List>
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            onClick={handleSubmit}
            style={{ marginTop: 16 }}
          >
            Download ({products.length} items)
          </Button>
        </>
      )}
    </div>
  );
}

export default ConvertFile;
