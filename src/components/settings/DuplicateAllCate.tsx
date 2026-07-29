import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { endpoint } from '@/constant/endpoint';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
} from 'antd';
import axios from 'axios';
import { useMemo, useState } from 'react';
interface FromValue {
  SKUPrefix: string;
  fromShopID: string;
  toShopID: string;
}

const DuplicateAllCate = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromWeb, setFromWeb] = useState('');
  const [form] = Form.useForm();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { categories, isLoading } = useCategories(fromWeb);
  const [messageApi, contextHolder] = message.useMessage();

  const onSubmit = async (values: FromValue) => {
    if (isLoading) return;
    const categoriesDuplicate = categories.map((cate) => ({
      ...cate,
      _id: undefined,
      SKUPrefix: values.SKUPrefix,
      shopID: values.toShopID,
    }));
    setLoading(true);
    setError('');
    try {
      await axios.post(endpoint.categoryConfigBulk, categoriesDuplicate);
      messageApi.open({
        type: 'success',
        content: 'Create category successfully!',
      });
      setIsModalOpen(false);
    } catch (error) {
      setError('Something went wrong, please try again!');
    } finally {
      setLoading(false);
    }
  };
  const { websiteConfigList } = useConfigWebsite();

  const { websiteConfigList: myWebsite } = useConfigWebsite();

  const websiteOptions = useMemo(() => {
    if (!websiteConfigList) return [];
    return websiteConfigList.map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [websiteConfigList]);

  const myWebsiteOptions = useMemo(() => {
    if (!myWebsite) return [];
    return myWebsite.map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [myWebsite]);

  return (
    <div>
      {contextHolder}
      <Button onClick={() => setIsModalOpen(true)}>
        Want to duplicate all categories from one shop to another?
      </Button>
      <Modal
        title='Duplicated All Categories'
        open={isModalOpen}
        footer={null}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form
          form={form}
          onFinish={onSubmit}
          layout='vertical'
          name='add-category-form'
          disabled={loading}
        >
          <Form.Item
            label='SKU prefix'
            name='SKUPrefix'
            rules={[{ required: true, message: 'Please input SKU prefix!' }]}
          >
            <Input placeholder='Ex: MY_WEBSITE.COM' />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='fromShopID'
                label='From Shop'
                rules={[
                  {
                    required: true,
                    message: 'Please select website for website!',
                  },
                ]}
              >
                <Select
                  placeholder='Select Shop'
                  options={websiteOptions}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={(value) => setFromWeb(value)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='toShopID'
                label='To Shop'
                rules={[
                  {
                    required: true,
                    message: 'Please select website for website!',
                  },
                ]}
              >
                <Select
                  placeholder='Select Shop'
                  options={myWebsiteOptions}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type='primary' htmlType='submit' loading={loading}>
              Submit
            </Button>
          </Form.Item>
          {error ? <Alert message={error} type='error' /> : null}
        </Form>
      </Modal>
    </div>
  );
};

export default DuplicateAllCate;
