"use client";
import Container from "@/components/commons/Container";
import Instruction from "@/components/settings/Instruction";
import ProductPipelineForm from "@/components/product-pipeline/ProductPipelineForm";

const ProductPipeline = () => {
  return (
    <Container title="Product Pipeline">
      <Instruction />
      <ProductPipelineForm />
    </Container>
  );
};

export default ProductPipeline;
