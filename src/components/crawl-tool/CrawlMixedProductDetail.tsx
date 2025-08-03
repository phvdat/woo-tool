'use client';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Form, Input, Button, Alert, Flex, message } from 'antd';
import * as XLSX from 'xlsx';
import { isEmpty } from 'lodash';
import dayjs from 'dayjs';
import { endpoint } from '@/constant/endpoint';
import { useUser } from '@/app/hooks/useUser';
import _get from 'lodash/get';
import { useSession } from 'next-auth/react';
import { SelectorFormValues } from './SelectorSetup';

type Product = {
  Name: string;
  Images: string;
};

interface FormValues {
  urls: string;
}

function CrawlMixedProductDetail() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FormValues>();
  const [file, setFile] = useState<Product[]>();
  const [loading, setLoading] = useState(false);
  const { data } = useSession();
  const { user } = useUser(data?.user?.email || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectors, setSelectors] = useState<SelectorFormValues[]>([]);

  const getAllSelectors = async () => {
    setLoading(true);
    try {
      const { status, data } = await axios.get(endpoint.addSelector);
      if (status === 200) {
        setSelectors(data);
      }
      return data;
    } catch (error) {
      console.log('getAllSelectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (value: FormValues) => {
    setLoading(true);
    setErrorMessage('');
    const { urls } = value;
    try {
      const { data } = await axios.post<Product[]>(
        endpoint.crawlMixedProductDetail,
        {
          urls,
          selectors,
          telegramId: user?.telegramId,
        }
      );

      setFile(data);
    } catch (error) {
      console.error('Error fetching product data: ', error);
      if (error instanceof Error) {
        setErrorMessage(_get(error, 'message', 'Something went wrong'));
      }
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!file) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(file);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(
      wb,
      `crawl-products-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.xlsx`
    );
  };

  const checkMissingDomain = async () => {
    const selectors: SelectorFormValues[] = await getAllSelectors();
    const urls = form.getFieldValue('urls');
    if (!urls) {
      setErrorMessage('Please enter product URLs first.');
      return;
    }
    const urlList = urls.split('\n').map((url: string) => url.trim());
    const missingDomains = urlList.filter(
      (url: string) =>
        !selectors.some((selector) => url.includes(selector.domain))
    );
    if (missingDomains.length > 0) {
      setErrorMessage(
        `The following domains are missing in the selectors:\n${missingDomains.join(
          '\n'
        )}`
      );
    } else {
      messageApi.info('All domains are present in the selectors.');
      setErrorMessage('');
    }
  };

  useEffect(() => {
    getAllSelectors();
  }, []);

  return (
    <div>
      {contextHolder}
      <Form
        onFinish={handleSubmit}
        labelCol={{ style: { minWidth: 180 } }}
        labelAlign='left'
        form={form}
      >
        <Form.Item<FormValues> name='urls'>
          <Input.TextArea placeholder='Enter products URL' rows={4} />
        </Form.Item>
        <Flex gap={8}>
          <Form.Item>
            <Button type='primary' htmlType='submit' loading={loading}>
              Get Product Info
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={checkMissingDomain}>Check missing domains</Button>
          </Form.Item>
          {isEmpty(file) || loading ? null : (
            <Button loading={loading} onClick={handleDownload}>
              Download file
            </Button>
          )}
        </Flex>
        {errorMessage && (
          <Alert
            message={
              <div style={{ whiteSpace: 'pre-line' }}>{errorMessage}</div>
            }
            type='error'
          />
        )}
      </Form>
    </div>
  );
}

export default CrawlMixedProductDetail;
