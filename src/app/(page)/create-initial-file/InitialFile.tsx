'use client';

import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import InitialFileTable from '@/components/create-initial-file/InitialFileTable';
import { handleDownloadFile } from '@/helper/woo';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Table,
} from 'antd';
import { useMemo, useState } from 'react';

export interface InitialFileValues {
  Name: string;
  Images: string;
  Categories: string;
  website: string;
}

const InitialFile = () => {
  const [form] = Form.useForm();
  const { watermarkConfig, isLoading: websiteLoading } = useWatermarkConfig();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [dataFile, setDataFile] = useState<
    Omit<InitialFileValues, 'website'>[]
  >([]);
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
    if (!watermarkConfig) return [];
    return watermarkConfig.map((watermark) => ({
      label: watermark.shopName,
      value: watermark._id,
    }));
  }, [watermarkConfig]);

  const handlePasteName = () => {
    navigator.clipboard.readText().then((text) => {
      form.setFieldValue('Name', text);
    });
  };

  const handlePasteImages = () => {
    navigator.clipboard.readText().then((text) => {
      const currentImages = form.getFieldValue('Images') || '';
      form.setFieldValue(
        'Images',
        currentImages ? `${currentImages},${text}` : text
      );
    });
  };

  const handleSubmit = async (values: InitialFileValues) => {
    const { website, ...data } = values;
    const name = data.Name;
    const isExistProductName = dataFile.find((item) => item.Name === name);
    if (isExistProductName) {
      message.error('Product name already exist!');
    } else {
      setDataFile((prev) => [...prev, data]);
      form.setFieldValue('Name', '');
      form.setFieldValue('Images', '');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <Form
        name='initial-file'
        onFinish={handleSubmit}
        layout='vertical'
        form={form}
      >
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

        <Form.Item<InitialFileValues>
          label='Name'
          name='Name'
          rules={[{ required: true, message: 'Please input product name' }]}
        >
          <Input
            suffix={
              <Button
                type='default'
                icon={<CopyOutlined />}
                onClick={() => handlePasteName()}
              >
                Paste
              </Button>
            }
            allowClear
          />
        </Form.Item>

        <Form.Item<InitialFileValues>
          label='Images'
          name='Images'
          rules={[{ required: true, message: 'Please input product images' }]}
        >
          <Input
            suffix={
              <Button
                type='default'
                icon={<CopyOutlined />}
                onClick={() => handlePasteImages()}
              >
                Paste Multiple
              </Button>
            }
            allowClear
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item<InitialFileValues>
              name='website'
              label='Watermark Website'
              rules={[
                {
                  required: true,
                  message: 'Please select watermark for website!',
                },
              ]}
            >
              <Select
                placeholder='Select Watermark Website'
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
            <Form.Item<InitialFileValues>
              name='Categories'
              label='Choose Category'
              rules={[{ required: true, message: 'Please select category!' }]}
            >
              <Select
                placeholder='Select Category'
                options={categoriesOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button htmlType='submit' block>
            Add Row
          </Button>
        </Form.Item>
      </Form>
      {dataFile.length ? (
        <>
          <InitialFileTable data={dataFile} />
          <Button
            type='primary'
            style={{ marginTop: '10px' }}
            htmlType='button'
            onClick={() => handleDownloadFile(dataFile)}
            block
          >
            <DownloadOutlined /> Download
          </Button>
        </>
      ) : null}
    </div>
  );
};

export default InitialFile;