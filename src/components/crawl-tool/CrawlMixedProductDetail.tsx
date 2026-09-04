"use client";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Button,
  Alert,
  Flex,
  message,
  Progress,
  Spin,
} from "antd";
import * as XLSX from "xlsx";
import { isEmpty } from "lodash";
import dayjs from "dayjs";
import { endpoint } from "@/constant/endpoint";
import { useUser } from "@/app/hooks/useUser";
import _get from "lodash/get";
import { useSession } from "next-auth/react";
import { SelectorFormValues } from "./SelectorSetup";
import { getSocket } from "@/config/socket";

type Product = {
  Name: string;
  Images: string;
};

interface FormValues {
  urls: string;
}
type Selector = {
  domain: string;
};
function CrawlMixedProductDetail() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FormValues>();
  const [file, setFile] = useState<Product[]>();
  const [loading, setLoading] = useState(false);
  const { data } = useSession();
  const { user } = useUser(data?.user?.email || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectors, setSelectors] = useState<SelectorFormValues[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [socketId, setSocketId] = useState<number>();

  const socket = useMemo(() => {
    const socket = getSocket();
    return socket.connect();
  }, []);

  const getAllSelectors = async () => {
    try {
      const { status, data } = await axios.get(endpoint.addSelector);
      if (status === 200) {
        setSelectors(data);
      }
      return data;
    } catch (error) {
      console.log("getAllSelectors:", error);
    }
  };

  const handleSubmit = async (value: FormValues) => {
    setProgress(1);
    const socketId = dayjs().unix();
    setSocketId(socketId);
    setErrorMessage("");
    setError("");
    const { urls } = value;
    try {
      const { data } = await axios.post<Product[]>(
        endpoint.crawlMixedProductDetail,
        {
          urls,
          selectors,
          telegramId: user?.telegramId,
          socketId,
        },
      );

      setFile(data);
    } catch (error: any) {
      const status = error?.response?.status;
      if ([502, 503, 504, 522, 524].includes(status)) {
        return;
      }
      console.error("Error fetching product data: ", error);
      if (error instanceof Error) {
        setErrorMessage(_get(error, "message", "Something went wrong"));
      }
    }
  };

  const handleDownload = () => {
    if (!file) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(file);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(
      wb,
      `crawl-products-${dayjs().format("YYYY-MM-DD-HH-mm-ss")}.xlsx`,
    );
  };

  const checkMissingDomain = async () => {
    setLoading(true);
    const selectors: SelectorFormValues[] = await getAllSelectors();
    const urls = form.getFieldValue("urls");
    if (!urls) {
      setErrorMessage("Please enter product URLs first.");
      return;
    }

    const urlList = urls.split("\n").map((url: string) => url.trim());

    const selectorDomainSet: Set<string> = new Set(
      selectors.map((s: Selector) => s.domain.toLowerCase()),
    );
    const uniqueDomains: Set<string> = new Set();
    for (let i = 0; i < urlList.length; i++) {
      const rawUrl = urlList[i].trim();
      if (!rawUrl) continue;

      try {
        const domain: string = new URL(rawUrl).hostname
          .replace(/^www\./, "")
          .toLowerCase();
        uniqueDomains.add(domain);
      } catch {
        // ignore invalid URL
      }
      setLoading(false);
    }

    const missingDomains: string[] = [];

    uniqueDomains.forEach((domain: string) => {
      if (!selectorDomainSet.has(domain)) {
        missingDomains.push(domain);
      }
    });
    if (missingDomains.length > 0) {
      setErrorMessage(
        `The following domains are missing in the selectors:\n${missingDomains.join(
          "\n",
        )}`,
      );
    } else {
      setErrorMessage("");
    }
  };

  const uniqueLink = () => {
    const urls = form.getFieldValue("urls");
    if (!urls) return;
    const urlList = urls.split("\n").map((url: string) => url.trim());
    const uniqueUrls = Array.from(new Set(urlList));
    form.setFieldValue("urls", uniqueUrls.join("\n"));
  };

  useEffect(() => {
    getAllSelectors();
  }, []);

  useEffect(() => {
    socket.on("crawl-progress", (payload) => {
      if (_get(payload, "socketId") !== socketId) return;
      setProgress(_get(payload, "progress.percent"));
    });
    socket.on("crawl-error", (payload) => {
      console.log("payload", payload);

      if (Number(_get(payload, "socketId")) !== socketId) return;
      const errorMessage = `${_get(
        payload,
        "error.url",
        "UnknownError",
      )}\n(${_get(payload, "error.message")})`;
      setError((prev) => `${prev}\n${errorMessage}`);
    });

    return () => {
      socket.off("crawl-progress");
    };
  }, [socketId]);

  return (
    <Spin spinning={loading}>
      {contextHolder}
      <Form
        onFinish={handleSubmit}
        labelCol={{ style: { minWidth: 180 } }}
        labelAlign="left"
        form={form}
      >
        <Form.Item<FormValues> name="urls">
          <Input.TextArea
            placeholder="Enter products URL"
            rows={20}
            onChange={() => {
              uniqueLink();
              checkMissingDomain();
            }}
          />
        </Form.Item>
        <Flex gap={8}>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Start Crawl
            </Button>
          </Form.Item>
          {isEmpty(file) || loading ? null : (
            <Button loading={loading} onClick={handleDownload}>
              Download file
            </Button>
          )}
        </Flex>
        {progress ? (
          <Progress
            percent={progress}
            strokeColor={{ from: "#108ee9", to: "#87d068" }}
          />
        ) : null}

        {error && (
          <Alert
            message={error}
            type="error"
            style={{
              marginTop: 24,
              whiteSpace: "pre-line",
            }}
          />
        )}
        {errorMessage && (
          <Alert
            message={
              <div style={{ whiteSpace: "pre-line" }}>{errorMessage}</div>
            }
            type="error"
          />
        )}
      </Form>
    </Spin>
  );
}

export default CrawlMixedProductDetail;
