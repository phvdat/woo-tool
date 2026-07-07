import { WooWebsitePayload } from "@/app/api/woo/website-config/route";
import { endpoint } from "@/constant/endpoint";
import { handleErrorMongoDB } from "@/helper/common";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Popconfirm,
  Typography,
  message,
} from "antd";
import axios from "axios";
import { useState } from "react";
import UpdateWebsiteListModal from "./UpdateWebsiteListModal";

const { Text } = Typography;
interface WebsiteWebsiteItem {
  website: WooWebsitePayload;
  refresh: any;
}

const WebsiteItem = ({ website, refresh }: WebsiteWebsiteItem) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleDeleteWebsite = async (_id: string) => {
    setLoading(true);
    try {
      await axios.delete(endpoint.websiteConfigList, { params: { _id } });
      messageApi.open({
        type: "success",
        content: "Delete website successfully!",
      });
      await refresh();
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
    setLoading(false);
  };
  return (
    <Col span={24} lg={{ span: 12 }} key={website._id}>
      {contextHolder}
      <Card>
        <Flex justify="space-between" gap={20}>
          <Text strong>{website.shopName}</Text>
          <Popconfirm
            title="Delete this website?"
            onConfirm={() => handleDeleteWebsite(website._id || "")}
            okText="Yes"
            cancelText="No"
          >
            <Button danger loading={loading}>
              Delete
            </Button>
          </Popconfirm>
          <UpdateWebsiteListModal
            _id={website._id}
            initialForm={website}
            refresh={refresh}
          />
        </Flex>
        {error ? <Alert message={error} type="error" /> : null}
      </Card>
    </Col>
  );
};

export default WebsiteItem;
