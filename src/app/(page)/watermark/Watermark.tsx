'use client';
import WatermarkForm from '@/components/watermark/WatermarkForm';
import { Typography } from 'antd';
const { Title } = Typography;

const Watermark = () => {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Title level={4} style={{ textAlign: 'center' }}>
        Watermark Tool
      </Title>
      <WatermarkForm />
    </div>
  );
};

export default Watermark;
