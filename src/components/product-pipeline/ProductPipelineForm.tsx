"use client";

import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import { getSocket } from "@/config/socket";
import { endpoint } from "@/constant/endpoint";
import { normFile } from "@/helper/common";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Progress,
  Row,
  Select,
  Spin,
  Typography,
  Upload,
} from "antd";
import axios from "axios";
import _get from "lodash/get";
import { useEffect, useMemo, useState } from "react";

const { Link } = Typography;

export interface ProductPipelineFormValue {
  websiteId: string;
  file: FileList;
}

interface PipelineProgress {
  percent: number;
  step: string;
  currentRow?: number;
  totalRows?: number;
}

export default function ProductPipelineForm() {
  const [form] = Form.useForm<ProductPipelineFormValue>();
  const { websiteConfigList, isLoading } = useConfigWebsite();

  const socket = useMemo(() => getSocket().connect(), []);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress>({
    percent: 0,
    step: "",
  });
  const websiteId = Form.useWatch("websiteId", form);

  const [pipelineError, setPipelineError] = useState("");
  const websiteOptions = useMemo(() => {
    return (websiteConfigList || []).map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [websiteConfigList]);

  const guessWebsite = (filename: string) => {
    const website = filename.split("-")[0].toLowerCase();
    const option = websiteOptions.find((item) =>
      item.label.toLowerCase().includes(website),
    );
    if (option) {
      form.setFieldValue("websiteId", option.value);
    }
  };

  const handleRunPipeline = async (values: ProductPipelineFormValue) => {
    const file = _get(values.file[0], "originFileObj");
    if (!file) return;
    setProcessing(true);
    setPipelineError("");

    setProgress({
      percent: 0,
      step: "Preparing...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("websiteId", values.websiteId);
      await axios.post(endpoint.productPipeline, formData);
      setProgress({
        percent: 100,
        step: "Completed",
      });
    } catch (e: any) {
      const status = e?.response?.status;
      if ([502, 503, 504, 522, 524].includes(status)) {
        return;
      }
      setPipelineError(_get(e, "response.data.message", "Pipeline failed"));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const onProgress = (payload: any) => {
      if (payload.socketId !== websiteId) return;
      setProgress(payload.progress);
    };

    const onError = (payload: any) => {
      if (payload.socketId !== websiteId) return;
      setPipelineError(
        (prev) => `${prev}\n${_get(payload, "message", "Unknown error")}`,
      );
      setProcessing(false);
    };

    const onFinished = (payload: any) => {
      if (payload.socketId !== websiteId) return;
      setProcessing(false);
      setProgress({
        percent: 100,
        step: "Completed",
      });
    };

    socket.on("pipeline-progress", onProgress);
    socket.on("pipeline-error", onError);
    socket.on("pipeline-finished", onFinished);

    return () => {
      socket.off("pipeline-progress", onProgress);
      socket.off("pipeline-error", onError);
      socket.off("pipeline-finished", onFinished);
    };
  }, [websiteId, socket]);

  useEffect(() => {
    if (websiteOptions.length) {
      form.setFieldValue("websiteId", websiteOptions[0].value);
    }
  }, [websiteOptions]);

  return (
    <Spin spinning={isLoading}>
      <Form<ProductPipelineFormValue>
        form={form}
        layout="vertical"
        onFinish={handleRunPipeline}
      >
        <Card title="Product Pipeline">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="websiteId"
                label="Website"
                rules={[
                  {
                    required: true,
                    message: "Please select website",
                  },
                ]}
              >
                <Select
                  options={websiteOptions}
                  showSearch
                  placeholder="Select website"
                  filterOption={(input, option) =>
                    String(option?.label)
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="file"
                label="Source Excel"
                valuePropName="fileList"
                getValueFromEvent={normFile}
                rules={[
                  {
                    required: true,
                    message: "Please upload excel file",
                  },
                ]}
              >
                <Upload
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={(info) => {
                    guessWebsite(_get(info, "file.name", ""));
                  }}
                >
                  <Button block>Upload Excel</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          {progress.percent > 0 && (
            <>
              <Progress percent={progress.percent} />

              <Typography.Text type="secondary">
                {progress.step}
              </Typography.Text>

              {progress.currentRow != null && progress.totalRows != null && (
                <div style={{ marginTop: 8 }}>
                  Row {progress.currentRow} / {progress.totalRows}
                </div>
              )}
            </>
          )}

          {pipelineError && (
            <Alert
              style={{ marginTop: 16, whiteSpace: "pre-line" }}
              type="error"
              message={pipelineError}
            />
          )}

          <Button
            type="primary"
            htmlType="submit"
            loading={processing}
            block
            style={{ marginTop: 24 }}
          >
            Run Pipeline
          </Button>
        </Card>
      </Form>
    </Spin>
  );
}
