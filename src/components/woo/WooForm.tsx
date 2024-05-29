'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import { useWoo } from '@/app/hooks/useWoo';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB, normFile } from '@/helper/common';
import { handleDownloadFile } from '@/helper/woo';
import { WooCommerce } from '@/types/woo';
import { DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Row,
  Select,
  Spin,
  Typography,
  Upload,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import axios from 'axios';
import _get from 'lodash/get';
import { useEffect, useMemo, useState } from 'react';
const { Text, Link } = Typography;

export interface WooFormValue {
  apiKey: string;
  file: FileList;
  promptQuestion: string;
  category: string;
  watermarkWebsite: string;
  telegramId: string;
}

const WooForm = () => {
  const [form] = Form.useForm<WooFormValue>();
  const [dataFile, setDataFile] = useState<WooCommerce[]>([]);
  const { woo, isLoading } = useWoo();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { categories } = useCategories();
  const { watermarkConfig } = useWatermarkConfig();

  const categoriesOptions = useMemo(() => {
    if (!categories) return [];
    return categories.map((category) => ({
      label: category.templateName,
      value: category._id,
    }));
  }, [categories]);

  const watermarkOptions = useMemo(() => {
    if (!watermarkConfig) return [];
    return watermarkConfig.map((watermark) => ({
      label: watermark.shopName,
      value: watermark._id,
    }));
  }, [watermarkConfig]);

  const createWoo = async (values: WooFormValue) => {
    try {
      await axios.post(endpoint.wooConfig, values);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      console.log('error create woo', errorMessage);
    }
  };

  const updateWoo = async (id: string, values: WooFormValue) => {
    try {
      await axios.put(endpoint.wooConfig, { _id: id, ...values });
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      console.log('error update woo', errorMessage);
    }
  };

  const onFinish = async (value: WooFormValue) => {
    if (woo) {
      updateWoo(_get(woo, '_id', ''), value);
    } else {
      createWoo(value);
    }
    setError('');
    setLoading(true);
    const { file, apiKey, promptQuestion, category } = value;
    const fileOrigin = _get(file[0], 'originFileObj');

    const categoriesObject = categories?.find((item) => item._id === category);
    const watermarkObject = watermarkConfig?.find(
      (item) => item._id === value.watermarkWebsite
    );
    setDataFile([]);

    if (fileOrigin && categoriesObject && watermarkObject) {
      try {
        const formData = new FormData();
        formData.append('file', fileOrigin);
        formData.append('apiKey', apiKey);
        formData.append('promptQuestion', promptQuestion);
        formData.append('categoriesObject', JSON.stringify(categoriesObject));
        formData.append('watermarkObject', JSON.stringify(watermarkObject));
        formData.append('telegramId', value.telegramId);
        const { data } = await axios.post<WooCommerce[]>(
          endpoint.wooCreate,
          formData
        );
        setDataFile(data);
      } catch (error: any) {
        setError(_get(error, 'response.data.message', ''));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (woo) {
      const { _id, file, ...initialForm } = woo;
      form.setFieldsValue(initialForm);
    }
  }, [woo, form]);

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout='vertical'
      disabled={isLoading}
      initialValues={woo}
    >
      {isLoading && (
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
      <Card>
        <Form.Item<WooFormValue>
          name='apiKey'
          label='Key ChatGPT'
          rules={[{ required: true, message: 'Please input API key!' }]}
        >
          <Input type='text' placeholder='API key' />
        </Form.Item>
        <Form.Item<WooFormValue> name='telegramId' label='Telegram ID'>
          <Input
            type='text'
            placeholder='Enter telegram id for receive file, if not you can download in this page'
          />
        </Form.Item>
        <Form.Item<WooFormValue>
          name='promptQuestion'
          label='Prompt Question'
          rules={[{ required: true, message: 'Please input prompt question!' }]}
        >
          <TextArea
            rows={4}
            placeholder='Ex: Write a story about {key} with 100 words'
          />
        </Form.Item>
        <Row gutter={16}>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item<WooFormValue>
              name='category'
              label={
                <span>
                  Choose Category{' '}
                  <Link href='/woo/config-categories' type='warning'>
                    <SettingOutlined />
                  </Link>{' '}
                </span>
              }
              rules={[{ required: true, message: 'Please select category!' }]}
            >
              <Select
                placeholder='Select Category'
                options={categoriesOptions}
                showSearch
              />
            </Form.Item>
          </Col>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item<WooFormValue>
              name='watermarkWebsite'
              label={
                <span>
                  Watermark Website{' '}
                  <Link href='/woo/config-watermark' type='warning'>
                    <SettingOutlined />
                  </Link>{' '}
                </span>
              }
              rules={[
                {
                  required: true,
                  message: 'Please select watermark for website!',
                },
              ]}
            >
              <Select
                placeholder='Select Watermark Website'
                options={watermarkOptions}
                showSearch
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item<WooFormValue>
          name='file'
          valuePropName='fileList'
          label='File'
          getValueFromEvent={normFile}
          rules={[{ required: true, message: 'Please upload file!' }]}
        >
          <Upload maxCount={1} style={{ width: '100%' }}>
            <Button block>Upload file excel</Button>
          </Upload>
        </Form.Item>
        <Text type='success'>
          *Note: You can close this tab and check the telegram message later.
        </Text>
      </Card>
      <Flex justify='center' gap={16} style={{ marginTop: 24 }}>
        <Button htmlType='submit' loading={loading} block type='primary'>
          Process
        </Button>
        {dataFile.length > 0 && (
          <Button
            htmlType='button'
            block
            onClick={() => handleDownloadFile(dataFile)}
          >
            <DownloadOutlined /> Download
          </Button>
        )}
      </Flex>
      {error && (
        <Alert message={error} type='error' style={{ marginTop: 24 }} />
      )}
    </Form>
  );
};

export default WooForm;
