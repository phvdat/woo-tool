'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useUser } from '@/app/hooks/useUser';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { getSocket } from '@/config/socket';
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
  Progress,
  Row,
  Select,
  Spin,
  Typography,
  Upload,
} from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import _get from 'lodash/get';
import { useSession } from 'next-auth/react';
import { useEffect, useId, useMemo, useState } from 'react';
const { Link } = Typography;

export const PUBLIC_TIME = 10;
export const GAP_MINUTES = 10;

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
  const [progress, setProgress] = useState<number>(0);
  const [socketId, setSocketId] = useState<number>();
  const [currentProcess, setCurrentProcess] = useState<string>('');

  const socket = useMemo(() => {
    const socket = getSocket();
    return socket.connect();
  }, []);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { categories } = useCategories();
  const { websiteConfigList } = useConfigWebsite();
  const watchShopId = Form.useWatch('watermarkWebsite', form);

  const categoriesOptions = useMemo(() => {
    const categoriesByShop = categories?.filter(
      (category) => category.shopID === watchShopId
    );
    if (!categoriesByShop) return [];
    return categoriesByShop.map((category) => ({
      label: category.templateName,
      value: category._id,
    }));
  }, [categories, watchShopId]);

  const watermarkOptions = useMemo(() => {
    if (!websiteConfigList) return [];
    return websiteConfigList.map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [websiteConfigList]);

  const onFinish = async (value: WooFormValue) => {
    const socketId = dayjs().unix();
    setSocketId(socketId);
    setError('');
    setProgress(0);
    setCurrentProcess('');
    setLoading(true);
    const { file, category } = value;
    const fileOrigin = _get(file[0], 'originFileObj');

    const categoriesObject = categories?.find((item) => item._id === category);
    const watermarkObject = websiteConfigList?.find(
      (item) => item._id === value.watermarkWebsite
    );
    setDataFile([]);

    if (fileOrigin && watermarkObject) {
      try {
        const formData = new FormData();
        formData.append('file', fileOrigin);
        categoriesObject &&
          formData.append('categoriesObject', JSON.stringify(categoriesObject));
        formData.append('watermarkObject', JSON.stringify(watermarkObject));
        formData.append('telegramId', value.telegramId);
        formData.append(
          'publicTime',
          (user?.publicTime || PUBLIC_TIME).toString()
        );
        formData.append(
          'gapMinutes',
          (user?.gapMinutes || GAP_MINUTES).toString()
        );
        formData.append('socketId', socketId.toString());
        const { data } = await axios.post<WooCommerce[]>(
          endpoint.wooCreate,
          formData
        );
        setDataFile(data);
      } catch (error: any) {
        console.log('error-woo', error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      form.setFieldValue('telegramId', user.telegramId);
    }
  }, [form, user]);

  useEffect(() => {
    socket.on('woo-progress', (payload) => {
      if (_get(payload, 'socketId') !== socketId) return;
      setProgress(_get(payload, 'progress.percent'));
      setCurrentProcess(_get(payload, 'progress.currentProcess'));
    });
    socket.on('woo-error', (payload) => {
      if (Number(_get(payload, 'socketId')) !== socketId) return;
      console.log('devvvv', _get(payload, 'error'));
      const errorMessage = `${_get(payload, 'error.status')} - ${_get(
        payload,
        'error.config.url'
      )}`;
      setError(errorMessage);
    });

    return () => {
      socket.off('woo-progress');
      socket.off('woo-error');
    };
  }, [socketId]);

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout='vertical'
      disabled={loading || isLoading}
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
        <Form.Item<WooFormValue> name='telegramId' label='Telegram ID'>
          <Input
            type='text'
            placeholder='Enter telegram id for receive file, if not you can download in this page'
          />
        </Form.Item>
        <Row gutter={16}>
          <Col span={24} sm={{ span: 12 }}>
            <Form.Item<WooFormValue>
              name='watermarkWebsite'
              label={
                <span>
                  Website Website{' '}
                  <Link href='/woo/config-website' type='warning'>
                    <SettingOutlined />
                  </Link>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: 'Please select website for website!',
                },
              ]}
            >
              <Select
                placeholder='Select Website Website'
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
      </Card>

      {progress ? (
        <>
          <Progress
            percent={progress}
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
          <p>Current line(Excel): {currentProcess + 2}</p>
        </>
      ) : null}

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
