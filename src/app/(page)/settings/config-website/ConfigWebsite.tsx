"use client";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import UpdateWebsiteListModal from "@/components/settings/UpdateWebsiteListModal";
import WebsiteItem from "@/components/settings/WebsiteItem";
import { endpoint } from "@/constant/endpoint";
import { Button, Flex, Row, Spin, Typography } from "antd";
import { useState } from "react";
const { Title } = Typography;

const ConfigWebsite = () => {
  const [loading, setLoading] = useState(false)
  const { mutate, websiteConfigList, isLoading } = useConfigWebsite();
  const blogRun = async () => {
    try {
      setLoading(true)
      fetch(endpoint.autoBlogs, {
        method: "post",
      });
    } catch (error) {}
    finally{
      setLoading(false)
    }
  };
  return (
    <div>
      <Title level={4}>Config Website</Title>
      {isLoading ? (
        <Flex justify="center">
          <Spin />
        </Flex>
      ) : null}
      <Button type="primary" onClick={blogRun} loading={loading}>
        Create Post Manual
      </Button>
      <Row gutter={[20, 20]} style={{ margin: "20px 0" }}>
        {websiteConfigList
          ? websiteConfigList.map((item) => (
              <WebsiteItem key={item._id} website={item} refresh={mutate} />
            ))
          : null}
      </Row>
      <UpdateWebsiteListModal refresh={mutate} />
    </div>
  );
};

export default ConfigWebsite;
