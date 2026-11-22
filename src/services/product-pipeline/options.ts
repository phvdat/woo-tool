import { ProductPipelineProcesses } from "./types";

export function resolvePipelineProcesses(
  processes?: Partial<ProductPipelineProcesses>,
): ProductPipelineProcesses {
  const resolved: ProductPipelineProcesses = {
    buildProducts: processes?.buildProducts ?? true,
    enrichProducts: processes?.enrichProducts ?? true,
    uploadProducts: processes?.uploadProducts ?? true,
  };

  if (!resolved.buildProducts && (resolved.enrichProducts || resolved.uploadProducts)) {
    throw new Error(
      "Build Products is required before Enrich Products or Upload Products.",
    );
  }

  if (
    !resolved.buildProducts &&
    !resolved.enrichProducts &&
    !resolved.uploadProducts
  ) {
    throw new Error("Select at least one process to run.");
  }

  return resolved;
}
