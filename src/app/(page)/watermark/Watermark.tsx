import WatermarkForm from '@/components/watermark/WatermarkForm';
import { Typography } from 'antd';
const { Title } = Typography;

const Watermark = () => {
  return (
    <div>
      <Title level={4} style={{ margin: 0 }}>
        WooCommerce ChatGPT
      </Title>
      <WatermarkForm />
    </div>
  );
};

export default Watermark;
