'use client';
import axios from 'axios';
import { useState } from 'react';
import { Form, Input, Button } from 'antd';
import * as XLSX from 'xlsx';
import { isEmpty } from 'lodash';
import dayjs from 'dayjs';
import { endpoint } from '@/constant/endpoint';

type Product = {
  Name: string;
  Images: string;
};

interface FormValues {
  urls: string;
  selectorProductName: string;
  selectorImageLinks: string;
}

function CrawlProductDetail() {
  const [file, setFile] = useState<Product[]>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (value: FormValues) => {
    setLoading(true);
    const { urls, selectorProductName, selectorImageLinks } = value;
    const urlsArray = urls.split(',');
    const promises = urlsArray.map((url) => {
      return axios.get(endpoint.crawlDetail, {
        params: { url, selectorProductName, selectorImageLinks },
      });
    });
    try {
      const response = await Promise.all(promises);
      const data = response.map((res) => res.data);
      setFile(data);
    } catch (error) {
      console.error('Error fetching product data: ', error);
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

  return (
    <div>
      <Form
        onFinish={handleSubmit}
        labelCol={{ style: { minWidth: 180 } }}
        labelAlign='left'
      >
        <Form.Item<FormValues> label='Products URL' name='urls'>
          <Input placeholder='Enter products URL' />
        </Form.Item>
        <Form.Item<FormValues>
          label='Product name selector'
          name='selectorProductName'
        >
          <Input placeholder='Enter product name selector' />
        </Form.Item>
        <Form.Item<FormValues>
          label='Image links selector'
          name='selectorImageLinks'
        >
          <Input placeholder='Enter image links selector' />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit' loading={loading}>
            Get Product Info
          </Button>
        </Form.Item>
        {isEmpty(file) || loading ? null : (
          <Button onClick={handleDownload}>Download file</Button>
        )}
      </Form>
    </div>
  );
}

export default CrawlProductDetail;