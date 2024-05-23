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
      <Button
        type='default'
        href='/woo/config-categories'
        style={{ marginTop: 20 }}
      >
        <SettingOutlined /> Config Categories
      </Button>
      <Button
        type='default'
        href='/woo/config-watermark-websites'
        style={{ marginTop: 20 }}
      >
        <SettingOutlined /> Config Watermark Websites
      </Button>
    </div>
  );
};

export default Woo;
