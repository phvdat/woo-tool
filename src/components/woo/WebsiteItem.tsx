import { WooWebsitePayload } from '@/app/api/woo/website-config/route';
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
import UpdateWebsiteListModal from './UpdateWebsiteListModal';

interface WebsiteWebsiteItem {
  website: WooWebsitePayload;
  refresh: any
}

const WebsiteItem = ({ website, refresh }: WebsiteWebsiteItem) => {
  const items: DescriptionsProps['items'] = [
    {
      key: '1',
      label: 'Logo url',
      children: website.logoUrl,
    },
    {
      key: '2',
      label: 'Shop name',
      children: website.shopName,
    },
    {
      key: '3',
      label: 'Quantity',
      children: website.quality,
    },
    {
      key: '4',
      label: 'Logo Width',
      children: website.logoWidth,
    },
    {
      key: '5',
      label: 'Logo Height',
      children: website.logoHeight,
    },
    {
      key: '6',
      label: 'Image Width',
      children: website.imageWidth,
    },
    {
      key: '7',
      label: 'Image Height',
      children: website.imageHeight,
    },
  ];
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleDeleteWebsite = async (_id: string) => {
    setLoading(true);
    try {
      await axios.delete(endpoint.websiteConfigList, { params: { _id } });
      messageApi.open({
        type: 'success',
        content: 'Delete website successfully!',
      });
      await refresh();
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
    setLoading(false);
  };
  return (
    <Col span={24} lg={{ span: 12 }} key={website._id}>
      {contextHolder}
      <Card>
        <Descriptions title={website.shopName} items={items} column={1} />
        <Flex justify='end' gap={20}>
          <Popconfirm
            title='Delete the category?'
            onConfirm={() => handleDeleteWebsite(website._id || '')}
            okText='Yes'
            cancelText='No'
          >
            <Button danger loading={loading}>
              Delete
            </Button>
          </Popconfirm>
          <UpdateWebsiteListModal _id={website._id} initialForm={website} />
        </Flex>
        {error ? <Alert message={error} type='error' /> : null}
      </Card>
    </Col>
  );
};

export default WebsiteItem;
