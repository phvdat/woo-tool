'use client';
import axios from 'axios';
import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { isEmpty } from 'lodash';
import { CopyFilled } from '@ant-design/icons';

function CrawlListProductUrl() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState<boolean>(false);
  const [url, setUrl] = useState('');
  const [productLinks, setProductLinks] = useState<string[]>([]);
  const [selectorProductLinks, setSelectorProductLinks] = useState<string>('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      );
      const htmlContent = response.data.contents;
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      const links = Array.from(doc.querySelectorAll(selectorProductLinks));
      const productLink = links.map((img) => (img as any).href);
      setProductLinks(productLink);
      console.log(productLink);
    } catch (error) {
      console.error('Error fetching products data: ', error);
    } finally {
      setLoading(false);
    }
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
        <Form.Item label='URL'>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder='Enter URL'
          />
        </Form.Item>

        <Form.Item label='Product links selector'>
          <Input
            value={selectorProductLinks}
            onChange={(e) => setSelectorProductLinks(e.target.value)}
            placeholder='Enter image links selector'
          />
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

          <div>{productLinks.join('\n')}</div>
        </div>
      )}
    </div>
  );
}

export default CrawlListProductUrl;
