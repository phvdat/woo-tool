'use client';
import { Button, Flex, Form, Select, Upload } from 'antd';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import { normFile } from '@/helper/common';
import {
  cleanData,
  getRecordByStores,
  getUniqueStores,
} from '@/helper/tracking-checker';
import TrackingTable from '@/components/tracking-checker/TrackingTable';
import { isEmpty, pick } from 'lodash';

interface FormValues {
  lenfulOrderFile: FileList;
  trackingFile: FileList;
  storesFilter: string[];
}

export interface LenfuLOrdersSheet {
  item_id: string;
  store_name: string;
  order_number: string;
  item_status: string;
  order_create_date: string;
  design_sku: string;
  product_name: string;
  item_total_price: string;
  item_shipping_price: string;
  item_trackings: string;
  shipping_method: string;
  email: string;
}

export interface TrackingSheet {
  order_number: string;
  tracking_carrier: string;
  tracking_status: string;
  tracking_create_date: string;
  shipping_country: string;
}

export interface TrackingOrderCombined
  extends TrackingSheet,
    LenfuLOrdersSheet {}
const TrackingChecker = () => {
  const [storeList, setStoreList] = useState<string[]>([]);
  const [lenfulOrderData, setLenfulOrderData] = useState<LenfuLOrdersSheet[]>(
    []
  );
  const [data, setData] = useState<TrackingOrderCombined[]>([]);
  const [dataByStores, setDataByStores] = useState<TrackingOrderCombined[]>([]);

  const beforeUploadLenfulOrder = async (file: any) => {
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as LenfuLOrdersSheet[];
    const clData = cleanData(data);
    setLenfulOrderData(clData);
    const storeList = getUniqueStores(data);
    setStoreList(storeList);
  };

  const beforeUploadTrackingFile = async (file: any) => {
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const trackingData = XLSX.utils.sheet_to_json(worksheet) as TrackingSheet[];
    const dataCombined = lenfulOrderData.map((order) => {
      const trackingItem = trackingData.find(
        (tracking) => tracking.order_number === order.order_number
      );
      return {
        ...order,
        ...pick(trackingItem, [
          'tracking_carrier',
          'tracking_status',
          'tracking_create_date',
          'shipping_country',
        ]),
      };
    }) as unknown as TrackingOrderCombined[];
    setData(dataCombined);
  };

  const onFinish = async (value: FormValues) => {
    const storesFilter = value.storesFilter;
    const dataByStores = getRecordByStores(data, storesFilter);
    setDataByStores(dataByStores);
    console.log('dataByStores', dataByStores);
  };

  return (
    <>
      <div style={{ margin: '20px auto' }}>
        <Form
          onFinish={onFinish}
          labelCol={{ style: { width: '150px' } }}
          labelAlign='left'
        >
          <Flex gap={20} wrap>
            <Form.Item<FormValues>
              name='lenfulOrderFile'
              valuePropName='fileList'
              getValueFromEvent={normFile}
              rules={[{ required: true, message: 'Please upload file!' }]}
            >
              <Upload maxCount={1} beforeUpload={beforeUploadLenfulOrder}>
                <Button block>Lenful Orders File</Button>
              </Upload>
            </Form.Item>
            <Form.Item<FormValues>
              name='trackingFile'
              valuePropName='fileList'
              getValueFromEvent={normFile}
              rules={[{ required: true, message: 'Please upload file!' }]}
            >
              <Upload
                maxCount={1}
                beforeUpload={beforeUploadTrackingFile}
                disabled={isEmpty(lenfulOrderData)}
              >
                <Button block>Tracking File</Button>
              </Upload>
            </Form.Item>
            {storeList.length > 0 && (
              <Form.Item name='storesFilter'>
                <Select
                  mode='multiple'
                  style={{ minWidth: '300px' }}
                  placeholder='Select stores'
                >
                  {storeList.map((item) => (
                    <Select.Option key={item}>{item}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
            <Form.Item>
              <Button type='primary' htmlType='submit'>
                Get Information Tracking
              </Button>
            </Form.Item>
          </Flex>
        </Form>
      </div>
      <TrackingTable data={dataByStores} key={data.toString()} />
    </>
  );
};

export default TrackingChecker;
