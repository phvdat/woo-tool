'use client';
import { useCategory } from '@/app/hooks/store/useCategory';
import { useStore } from '@/app/hooks/store/useStore';
import { useStoreList } from '@/app/hooks/store/useStoreList';
import { useUser } from '@/app/hooks/user/useUser';
import { endpoint } from '@/constant/endpoint';
import { navigation } from '@/constant/navigation';
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

const PUBLIC_MINUTES = 10;
const GAP_MINUTES = 5;

export interface WooFormValue {
  file: FileList;
  category: string;
  store: string;
  telegramId: string;
}

const WooForm = () => {
  const [form] = Form.useForm<WooFormValue>();
  const [dataFile, setDataFile] = useState<WooCommerce[]>([]);
  const { data } = useSession();
  const { user, isLoading } = useUser(data?.user?.email as string);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { storeList } = useStoreList();
  const { store } = useStore(form.getFieldValue('storeId'));

  const categoriesOptions = useMemo(() => {
    if (!store?.categories) return [];
    const categories = store.categories;
    return categories.map((category) => ({
      label: category.categoryName,
      value: category._id,
    }));
  }, [store]);

  const storeOption = useMemo(() => {
    if (!storeList) return [];
    return storeList.map((store) => ({
      label: store.watermark.shopName,
      value: store._id,
    }));
  }, [storeList]);

  const onFinish = async (value: WooFormValue) => {
    setError('');
    setLoading(true);
    const { file, category } = value;
    const fileOrigin = _get(file[0], 'originFileObj');

    setDataFile([]);

    if (fileOrigin) {
      try {
        const formData = new FormData();
        formData.append('file', fileOrigin);
        formData.append('categoryId', value.category);
        formData.append('storeId', value.store);
        formData.append('telegramId', value.telegramId);
        formData.append(
          'publicMinutes',
          (user?.settings.publicMinutes || PUBLIC_MINUTES).toString()
        );
        formData.append(
          'gapMinutes',
          (user?.settings.gapMinutes || GAP_MINUTES).toString()
        );
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
      form.setFieldValue('telegramId', user.settings?.telegramId || '');
    }
  }, [form, user]);

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
              name='store'
              label={
                <span>
                  Store{' '}
                  <Link
                    href={navigation.configStore(user?._id as string)}
                    type='warning'
                  >
                    <SettingOutlined />
                  </Link>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: 'Please select store!',
                },
              ]}
            >
              <Select
                placeholder='Select Store'
                options={storeOption}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          {form.getFieldValue('storeId') && (
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
          )}
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
