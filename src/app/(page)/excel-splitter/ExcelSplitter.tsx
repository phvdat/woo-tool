'use client';
import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import { normFile } from '@/helper/common';
import { handleDownloadFile } from '@/helper/woo';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Upload } from 'antd';
import _get from 'lodash/get';
import { useEffect } from 'react';
import * as XLSX from 'xlsx';

const SPLIT_NAME_LOCAL_KEY = 'splitName';

const ExcelSplitter = () => {
  const [form] = Form.useForm();
  const [websiteNames, setWebsiteNames] = useLocalStorage(
    SPLIT_NAME_LOCAL_KEY,
    ''
  );

  const handleSubmit = async (values: any) => {
    setWebsiteNames(values.websiteNames);
    const file = values.file;
    const fileOrigin = _get(file[0], 'originFileObj') as unknown as File;

    const workbook = XLSX.read(await fileOrigin.arrayBuffer(), {
      type: 'array',
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(wordSheet);
    splitAndExport(data, values.websiteNames);
  };

  const splitAndExport = (data: any, websiteNames: string) => {
    const websiteNamesList = websiteNames.split(',').map((item) => item.trim());
    const chunkSize = Math.ceil(data.length / websiteNamesList.length);
    for (let i = 0; i < websiteNamesList.length; i++) {
      const start = i * chunkSize;
      const end = (i + 1) * chunkSize;
      const chunk = data.slice(start, end);
      handleDownloadFile(chunk, websiteNamesList[i]);
    }
  };

  useEffect(() => {
    if (websiteNames) {
      form.setFieldValue('websiteNames', websiteNames);
    }
  }, [websiteNames]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Published Time Tool</h1>
      <Form onFinish={handleSubmit} layout='vertical' form={form}>
        <Form.Item
          label='Website Name'
          name='websiteNames'
          rules={[
            {
              required: true,
              message: 'Please input website names!',
            },
          ]}
        >
          <Input
            style={{ width: '100%' }}
            placeholder='Website names split by comma'
          />
        </Form.Item>

        <Form.Item
          name='file'
          valuePropName='fileList'
          label='File'
          getValueFromEvent={normFile}
          rules={[{ required: true, message: 'Please upload file!' }]}
        >
          <Upload
            beforeUpload={() => false}
            style={{ width: '100%' }}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} block>
              Upload Excel
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type='primary' htmlType='submit'>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
export default ExcelSplitter;
