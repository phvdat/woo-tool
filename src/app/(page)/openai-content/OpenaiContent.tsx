'use client';
import OpenaiContentForm from '@/components/openai-content/OpenaiContentForm';
import { Typography } from 'antd';
const { Title } = Typography;

const OpenaiContent = () => {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Title level={4} style={{ textAlign: 'center' }}>
        OpenAI Content Tool
      </Title>
      <OpenaiContentForm />
    </div>
  );
};

export default OpenaiContent;
