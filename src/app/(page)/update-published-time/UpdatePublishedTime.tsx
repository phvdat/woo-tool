'use client';
import React, { use, useEffect, useState } from 'react';
import { Form, InputNumber, Upload, Button, message, Col, Row } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { handleDownloadFile } from '@/helper/woo';
import { WooCommerce } from '@/types/woo';
import { normFile } from '@/helper/common';
import _get from 'lodash/get';
import dayjs from 'dayjs';
import { useLocalStorage } from 'usehooks-ts';

const PUB_TIME_AFTER = 'PUB_TIME_AFTER';
const GAP_FROM = 'GAP_FROM';
const GAP_TO = 'GAP_TO';

interface FormValues {
  after: number;
  gapFrom: number;
  gapTo: number;
  file: FileList;
}
const UpdatePublishedTime = () => {
  const [form] = Form.useForm();
  const [dataFile, setDataFile] = useState<WooCommerce[]>([]);
  const [afterLocal, setAfterLocal] = useLocalStorage(PUB_TIME_AFTER, 3);
  const [gapFromLocal, setGapFromTimeLocal] = useLocalStorage(GAP_FROM, 5);
  const [gapToLocal, setGapToTimeLocal] = useLocalStorage(GAP_TO, 5);

  const handleSubmit = async (values: FormValues) => {
    const { after, gapFrom, gapTo, file } = values;
    setAfterLocal(after);
    setGapFromTimeLocal(gapFrom);
    setGapToTimeLocal(gapTo);
    const fileOrigin = _get(file[0], 'originFileObj') as unknown as File;

    const workbook = XLSX.read(await fileOrigin.arrayBuffer(), {
      type: 'array',
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: WooCommerce[] = XLSX.utils.sheet_to_json(wordSheet);

    let publishedDate = dayjs().add(after, 'minute');
    const result = data.map((row, index) => {
      const gapSeconds = gapFrom * 60 + Math.random() * (gapTo - gapFrom) * 60;
      publishedDate = publishedDate.add(gapSeconds, 'second');

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
    form.setFieldValue('gapFrom', Number(gapFromLocal));
    form.setFieldValue('gapTo', gapToLocal);
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Published Time Tool</h1>
      <Form onFinish={handleSubmit} layout='vertical' form={form}>
        <Form.Item<FormValues>
          label='After'
          name='after'
          rules={[{ required: true, message: 'Please input after time!' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Row gutter={[20, 20]}>
          <Col span={12}>
            <Form.Item<FormValues>
              label='Gap Time From'
              name='gapFrom'
              rules={[{ required: true, message: 'Please input gap time!' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder='From'
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FormValues>
              label='Gap Time To'
              name='gapTo'
              rules={[{ required: true, message: 'Please input gap time!' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder='From'
              />
            </Form.Item>
          </Col>
        </Row>

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
