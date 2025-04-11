'use client';

import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { convertToAcronym, normFile } from '@/helper/common';
import { handleDownloadFile } from '@/helper/woo';
import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Flex,
  Form,
  Image,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Upload,
} from 'antd';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
interface Product {
  key: number;
  Name: string;
  Images: string;
  Categories: string;
}
function ConvertHACFile() {
  const [form] = Form.useForm();
  const [products, setProducts] = useState<Product[]>([]);
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
      Categories: '', // Mặc định chưa chọn
    }));
    setProducts((prev) => [...prev, ...formatted]);
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

  const handleDelete = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  return (
    <div
      style={{
        margin: '20px auto',
      }}
    >
      <h1>Convert HAC File</h1>
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
            style={{ marginTop: 24 }}
            bordered
            dataSource={products}
            renderItem={(item, index) => (
              <List.Item>
                <Row style={{ width: '100%' }} gutter={12}>
                  <Col span={24} lg={{ span: 12 }}>
                    <Flex style={{ width: '100%' }} gap={12} wrap>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(index)}
                        style={{ flex: 1 }}
                      >
                        Xoá
                      </Button>

                      <Select
                        placeholder='Select Category'
                        onChange={(value) => handleCategoryChange(index, value)}
                        options={categoriesOptions}
                        showSearch
                        style={{ flex: 3 }}
                        filterOption={(input, option) => {
                          const searchFull = (option?.label ?? '')
                            .toLowerCase()
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
                        value={item.Name}
                        onChange={(e) =>
                          handleNameChange(index, e.target.value)
                        }
                        style={{ width: '100%' }}
                      />
                    </Flex>
                  </Col>
                  <Col span={24} lg={{ span: 12 }}>
                    <Flex gap={12}>
                      {item.Images.split(',').map((img: string, idx) => (
                        <Image
                          src={img}
                          width={100}
                          height={100}
                          key={idx}
                          alt='product'
                        />
                      ))}
                    </Flex>
                  </Col>
                </Row>
              </List.Item>
            )}
          />
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadFile(products, 'Converted')}
            style={{ marginTop: 16 }}
          >
            Download Updated Excel
          </Button>
        </>
      )}
    </div>
  );
}

export default ConvertHACFile;
