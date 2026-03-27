"use client";
import Container from "@/components/commons/Container";
import Instruction from "@/components/woo/Instruction";
import WooForm from "@/components/woo/WooForm";
import { Typography } from "antd";
const { Title } = Typography;

const Woo = () => {
  return (
    <Container title="WooCommerce Tool">
      <Instruction />
      <WooForm />
    </Container>
  );
};

export default Woo;
