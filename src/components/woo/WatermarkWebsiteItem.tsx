import { WooWatermarkPayload } from '@/app/api/woo/watermark/route';
import { useWatermarkWebsites } from '@/app/hooks/useWatermarkWebsites';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsProps,
  Flex,
  Popconfirm,
  message,
} from 'antd';
import axios from 'axios';
import { useState } from 'react';
import UpdateWatermarkList from './UpdateWatermarkList';

interface WatermarkWebsiteItem {
  watermark: WooWatermarkPayload;
}

const WatermarkWebsiteItem = ({ watermark }: WatermarkWebsiteItem) => {
  const items: DescriptionsProps['items'] = [
    {
      key: '1',
      label: 'Logo url',
      children: watermark.logoUrl,
    },
    {
      key: '2',
      label: 'Shop name',
      children: watermark.shopName,
    },
    {
      key: '3',
      label: 'Quantity',
      children: watermark.quality,
    },
    {
      key: '4',
      label: 'Logo Width',
      children: watermark.logoWidth,
    },
    {
      key: '5',
      label: 'Logo Height',
      children: watermark.logoHeight,
    },
    {
      key: '6',
      label: 'Image Width',
      children: watermark.imageWidth,
    },
    {
      key: '7',
      label: 'Image Height',
      children: watermark.imageHeight,
    },
  ];
  const { mutate } = useWatermarkWebsites();
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleDeleteCategory = async (_id: string) => {
    setLoading(true);
    try {
      await axios.delete(endpoint.category, { params: { _id } });
      messageApi.open({
        type: 'success',
        content: 'Delete category successfully!',
      });
      await mutate();
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
    setLoading(false);
  };
  return (
    <Col span={24} lg={{ span: 12 }} key={watermark._id}>
      {contextHolder}
      <Card>
        <Descriptions title={watermark.shopName} items={items} />
        <Flex justify='end' gap={20}>
          <Popconfirm
            title='Delete the category?'
            onConfirm={() => handleDeleteCategory(watermark._id || '')}
            okText='Yes'
            cancelText='No'
          >
            <Button danger loading={loading}>
              Delete
            </Button>
          </Popconfirm>
          <UpdateWatermarkList _id={watermark._id} initialForm={watermark} />
        </Flex>
        {error ? <Alert message={error} type='error' /> : null}
      </Card>
    </Col>
  );
};

export default WatermarkWebsiteItem;
