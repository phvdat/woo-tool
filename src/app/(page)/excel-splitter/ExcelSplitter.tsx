'use client';
import { normFile } from '@/helper/common';
import { handleDownloadFile } from '@/helper/woo';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Form, InputNumber, Upload } from 'antd';
import _get from 'lodash/get';
import * as XLSX from 'xlsx';

const ExcelSplitter = () => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    const file = values.file;
    const fileOrigin = _get(file[0], 'originFileObj') as unknown as File;

    const workbook = XLSX.read(await fileOrigin.arrayBuffer(), {
      type: 'array',
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(wordSheet);
    splitAndExport(data, values.splitCount);
  };

  const splitAndExport = (data: any, splitCount: number) => {
    const chunkSize = Math.ceil(data.length / splitCount);
    for (let i = 0; i < splitCount; i++) {
      const start = i * chunkSize;
      const end = (i + 1) * chunkSize;
      const chunk = data.slice(start, end);
      handleDownloadFile(chunk, `initial-${i + 1}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Published Time Tool</h1>
      <Form onFinish={handleSubmit} layout='vertical' form={form}>
        <Form.Item
          label='Split Count'
          name='splitCount'
          rules={[{ required: true, message: 'Please input split count!' }]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder='Split Count'
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
