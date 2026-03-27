"use client";
import Container from "@/components/commons/Container";
import OpenaiContentForm from "@/components/openai-content/OpenaiContentForm";
import { Typography } from "antd";
const { Title } = Typography;

const OpenaiContent = () => {
  return (
    <Container title="Generate AI description">
      <OpenaiContentForm />
    </Container>
  );
  Container;
};

export default OpenaiContent;
