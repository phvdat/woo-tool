"use client";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import UpdateWebsiteListModal from "@/components/woo/UpdateWebsiteListModal";
import WebsiteItem from "@/components/woo/WebsiteItem";
import { Button, Flex, Row, Spin, Typography } from "antd";
import { useSession } from "next-auth/react";
const { Title } = Typography;

const ConfigWebsite = () => {
  const { data } = useSession();
  const { mutate, websiteConfigList, isLoading } = useConfigWebsite(
    data?.user?.email || "",
  );
  const blogRun = async () => {
    try {
      fetch("/api/blog/run", {
        method: 'post'
      });
    } catch (error) {}
  };
  return (
    <div>
      <Title level={4}>Config Website</Title>
      {isLoading ? (
        <Flex justify="center">
          <Spin />
        </Flex>
      ) : null}
      <Button type="primary" onClick={blogRun}>Create Post Manual</Button>
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
