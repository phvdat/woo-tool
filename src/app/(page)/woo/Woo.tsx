'use client';
import Instruction from '@/components/woo/Instruction';
import WooForm from '@/components/woo/WooForm';
import { SettingOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
const { Title } = Typography;

const Woo = () => {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Title level={4} style={{ textAlign: 'center' }}>
        WooCommerce ChatGPT
      </Title>
      <Instruction />
      <WooForm />
    </div>
  );
};

export default Woo;
