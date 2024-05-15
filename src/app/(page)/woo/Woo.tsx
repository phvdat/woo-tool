import WooForm from '@/components/woo/WooForm';
import { SettingOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const Woo = () => {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <WooForm />
      <Button type='default' href='/woo/config-categories' style={{ marginTop: 20 }}>
        <SettingOutlined /> Config Categories
      </Button>
    </div>
  );
};

export default Woo;
