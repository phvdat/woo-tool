import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import { SettingFilled } from '@ant-design/icons';
import { Button, Form, Input, Modal } from 'antd';
import { useState } from 'react';
interface CateKeywordConfigProps {
  categoriesOptions: string[];
}

export const CATE_KEYWORD_LOCAL_KEY = 'CATE_KEYWORD_LOCAL_KEY';
const CateKeywordConfig = ({ categoriesOptions }: CateKeywordConfigProps) => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cateKeyword, setCateKeyword] = useLocalStorage<{
    [key: string]: string[];
  }>(CATE_KEYWORD_LOCAL_KEY, {});

  const handleSubmit = (values: { [key: string]: string }) => {
    const data = Object.entries(values).reduce((acc, [key, value]) => {
      if (!value) return acc;
      return {
        ...acc,
        [key]: value?.split(',').map((item) => item.trim()),
      };
    }, {});
    setCateKeyword(data);
  };

  return (
    <div style={{ display: 'inline' }}>
      <SettingFilled onClick={() => setIsModalOpen(true)} />
      <Modal
        width={'100%'}
        style={{ top: 20 }}
        title='Cate Keyword Config'
        open={isModalOpen}
        footer={null}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form
          name='cate-keyword-config-form'
          onFinish={handleSubmit}
          layout='vertical'
          form={form}
          initialValues={cateKeyword}
        >
          {categoriesOptions.map((category, index) => (
            <Form.Item
              label={category.split('>').pop()}
              name={category}
              key={index}
            >
              <Input allowClear />
            </Form.Item>
          ))}

          <Form.Item>
            <Button
              htmlType='submit'
              block
              type='primary'
              style={{ width: '100%', backgroundColor: 'green' }}
            >
              Save
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CateKeywordConfig;
