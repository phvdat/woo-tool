"use client";
import Container from "@/components/commons/Container";
import Instruction from "@/components/settings/Instruction";
import ProductPipelineForm from "@/components/product-pipeline/ProductPipelineForm";

const ProductPipeline = () => {
  return (
    <Container
      title="Product Pipeline"
      subtitle="Automate product import and processing"
      size="lg"
    >
      <Instruction />
      <ProductPipelineForm />
    </Container>
  );
};

export default ProductPipeline;
