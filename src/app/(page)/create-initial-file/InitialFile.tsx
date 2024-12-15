'use client';

import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
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
import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

const INITIAL_DATA = 'INITIAL_DATA';

export interface InitialFileValues {
  Name: string;
  Images: string;
  Categories: string;
  website: string;
}

const InitialFile = () => {
  const [form] = Form.useForm();
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [dataFile, setDataFile] = useState<
    Omit<InitialFileValues, 'website'>[]
  >([]);
  const [dataLocal, setDataLocal] = useLocalStorage(INITIAL_DATA, '[]');
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
    const name = data.Name.replaceAll(/\n/, '').trim();
    const isExistProductName = dataFile.find((item) => item.Name === name);
    if (isExistProductName) {
      message.error('Product name already exist!');
    } else {
      setDataFile((prev) => [...prev, data]);
      setDataLocal(JSON.stringify([...dataFile, data]));
      form.setFieldValue('Name', '');
      form.setFieldValue('Images', '');
      message.success('Product added successfully!');
    }
  };

  const removeRecordByName = (name: string) => {
    setDataFile((prev) => prev.filter((item) => item.Name !== name));
  };

  useEffect(() => {
    setDataFile(JSON.parse(dataLocal) || []);
  }, []);

  return (
    <div>
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
      </div>
      {dataFile.length ? (
        <>
          <InitialFileTable
            data={dataFile}
            removeRecordByName={removeRecordByName}
          />
          <Button
            type='primary'
            style={{ marginTop: '10px' }}
            htmlType='button'
            onClick={() => {
              handleDownloadFile(dataFile, 'initial-file');
              setDataLocal('[]');
            }}
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
