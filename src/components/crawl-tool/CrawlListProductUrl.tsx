'use client';
import axios from 'axios';
import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { isEmpty, trim } from 'lodash';
import { CopyFilled } from '@ant-design/icons';
import { endpoint } from '@/constant/endpoint';

interface FormValues {
  urls: string;
  productLinksSelector: string;
}

function CrawlListProductUrl() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState<boolean>(false);
  const [productLinks, setProductLinks] = useState<string[]>([]);

  const handleSubmit = async (value: FormValues) => {
    setLoading(true);
    const { urls, productLinksSelector } = value;

    const urlsArray = urls.split(',');
    const promises = urlsArray.map((url) => {
      return axios.get(endpoint.crawlList, {
        params: { url: trim(url), productLinksSelector },
      });
    });
    try {
      const response = await Promise.all(promises);
      const data = response.map((res) => res.data);
      console.log(data);

      const productLinks = data.flat();
      setProductLinks(productLinks);
    } catch (error) {
      console.error('Error fetching product data: ', error);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(productLinks.join(','));
    messageApi.open({
      type: 'success',
      content: 'Copy successfully',
    });
  };

  return (
    <div>
      {contextHolder}
      <Form
        onFinish={handleSubmit}
        labelCol={{ style: { minWidth: 180 } }}
        labelAlign='left'
      >
        <Form.Item<FormValues> label='Pages URL' name='urls'>
          <Input.TextArea placeholder='Enter Pages URL' />
        </Form.Item>

        <Form.Item<FormValues>
          label='Product links selector'
          name='productLinksSelector'
        >
          <Input placeholder='Enter image links selector' />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit' loading={loading}>
            Get Products Link
          </Button>
        </Form.Item>
      </Form>
      {isEmpty(productLinks) ? null : (
        <div>
          <Button onClick={handleCopy} icon={<CopyFilled />}>
            Click to copy
          </Button>
          <div>{productLinks.join(',')}</div>
        </div>
      )}
    </div>
  );
}

export default CrawlListProductUrl;