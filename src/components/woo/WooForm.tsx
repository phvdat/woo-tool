'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useUser } from '@/app/hooks/useUser';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import { endpoint } from '@/constant/endpoint';
import { normFile } from '@/helper/common';
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
import axios from 'axios';
import _get from 'lodash/get';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
const { Text, Link } = Typography;

export interface WooFormValue {
  file: FileList;
  category: string;
  watermarkWebsite: string;
  telegramId: string;
}

const WooForm = () => {
  const [form] = Form.useForm<WooFormValue>();
  const [dataFile, setDataFile] = useState<WooCommerce[]>([]);
  const { data } = useSession();
  const { user, isLoading } = useUser(data?.user?.email || '');

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

  const onFinish = async (value: WooFormValue) => {
    setError('');
    setLoading(true);
    const { file, category } = value;
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
    if (user) {
      form.setFieldValue('telegramId', user.telegramId);
    }
  }, [form, user]);

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout='vertical'
      disabled={loading || isLoading}
    >
      {(loading || isLoading) && (
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
        <Form.Item<WooFormValue> name='telegramId' label='Telegram ID'>
          <Input
            type='text'
            placeholder='Enter telegram id for receive file, if not you can download in this page'
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
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
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
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
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
