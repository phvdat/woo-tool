'use client';
import OpenaiContentForm from '@/components/openai-content/OpenaiContentForm';
import GroqAIContentForm from '@/components/pro-features/groq-ai-content/GroqAIContentForm';
import { Typography } from 'antd';
const { Title } = Typography;

const GroqAIContent = () => {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Title level={4} style={{ textAlign: 'center' }}>
        Groq AI Content Tool
      </Title>
      <GroqAIContentForm />
    </div>
  );
};

export default GroqAIContent;
