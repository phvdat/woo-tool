export interface ProductPipelineProcesses {
    buildProducts: boolean;
    enrichProducts: boolean;
    uploadProducts: boolean;
}

export interface ProductPipelineContext {
    file: File;
    websiteId: string;
    userEmail: string;
    socketId: string;
    processes?: Partial<ProductPipelineProcesses>;
}
