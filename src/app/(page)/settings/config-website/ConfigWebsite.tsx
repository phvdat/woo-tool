"use client";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import Container from "@/components/commons/Container";
import UpdateWebsiteListModal from "@/components/settings/UpdateWebsiteListModal";
import WebsiteItem from "@/components/settings/WebsiteItem";
import { endpoint } from "@/constant/endpoint";
import { Button, Flex, Row, Spin, Empty, Typography } from "antd";
import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useState } from "react";
const { Text } = Typography;

const ConfigWebsite = () => {
  const [loading, setLoading] = useState(false);
  const { mutate, websiteConfigList, isLoading } = useConfigWebsite();

  const blogRun = async () => {
    try {
      setLoading(true);
      fetch(endpoint.autoBlogs, {
        method: "post",
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      title="Website Configuration"
      subtitle="Manage your WooCommerce websites and blog settings"
      breadcrumb={[{ title: "Settings" }, { title: "Websites" }]}
      extra={
        <Flex gap={8}>
          <Button
            icon={<SyncOutlined />}
            onClick={blogRun}
            loading={loading}
          >
            Create Post Manual
          </Button>
          <UpdateWebsiteListModal refresh={mutate} />
        </Flex>
      }
    >
      {isLoading ? (
        <Flex justify="center" align="center" style={{ padding: 60 }}>
          <Spin size="large" />
        </Flex>
      ) : websiteConfigList && websiteConfigList.length > 0 ? (
        <Row gutter={[16, 16]}>
          {websiteConfigList.map((item) => (
            <WebsiteItem key={item._id} website={item} refresh={mutate} />
          ))}
        </Row>
      ) : (
        <Empty
          description={
            <Text type="secondary">No websites configured yet. Add your first website to get started.</Text>
          }
        >
          <UpdateWebsiteListModal refresh={mutate} />
        </Empty>
      )}
    </Container>
  );
};

export default ConfigWebsite;
