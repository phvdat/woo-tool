'use client';
import React, { use, useEffect, useState } from 'react';
import { Form, InputNumber, Upload, Button, message } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { handleDownloadFile } from '@/helper/woo';
import { WooCommerce } from '@/types/woo';
import { normFile } from '@/helper/common';
import _get from 'lodash/get';
import dayjs from 'dayjs';
import { useLocalStorage } from 'usehooks-ts';

const PUB_TIME_AFTER = 'PUB_TIME_AFTER';
const GAP_TIME = 'GAP_TIME';

interface FormValues {
  after: number;
  gapTime: number;
  file: FileList;
}
const UpdatePublishedTime = () => {
  const [form] = Form.useForm();
  const [dataFile, setDataFile] = useState<WooCommerce[]>([]);
  const [afterLocal, setAfterLocal] = useLocalStorage(PUB_TIME_AFTER, 3);
  const [gapTimeLocal, setGapTimeLocal] = useLocalStorage(GAP_TIME, 5);

  const handleSubmit = async (values: FormValues) => {
    const { after, gapTime, file } = values;
    setAfterLocal(after);
    setGapTimeLocal(gapTime);
    const fileOrigin = _get(file[0], 'originFileObj') as unknown as File;

    const workbook = XLSX.read(await fileOrigin.arrayBuffer(), {
      type: 'array',
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: WooCommerce[] = XLSX.utils.sheet_to_json(wordSheet);

    let startTime = dayjs().add(after, 'minute');
    const result = data.map((row, index) => {
      const publishedDate = startTime.add(gapTime * index, 'minute');

      return {
        ...row,
        'Published Date': publishedDate.format('YYYY-MM-DD HH:mm:ss'),
      };
    });
    setDataFile(result);
    message.success('File processed successfully!');
  };

  useEffect(() => {
    form.setFieldValue('after', Number(afterLocal));
    form.setFieldValue('gapTime', Number(gapTimeLocal));
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Published Time Tool</h1>
      <Form onFinish={handleSubmit} layout='vertical' form={form}>
        <Form.Item<FormValues>
          label='After (minutes)'
          name='after'
          rules={[{ required: true, message: 'Please input after time!' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item<FormValues>
          label='Gap Time (minutes)'
          name='gapTime'
          rules={[{ required: true, message: 'Please input gap time!' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item<FormValues>
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
          {dataFile.length > 0 ? (
            <Button
              type='default'
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadFile(dataFile, 'published-time')}
              style={{ marginLeft: 10 }}
            >
              Download Processed File
            </Button>
          ) : null}
        </Form.Item>
      </Form>
    </div>
  );
};

export default UpdatePublishedTime;
