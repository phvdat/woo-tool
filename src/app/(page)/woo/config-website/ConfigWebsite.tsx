'use client';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import UpdateWebsiteListModal from '@/components/woo/UpdateWebsiteListModal';
import WebsiteItem from '@/components/woo/WebsiteItem';
import { Flex, Row, Spin, Typography } from 'antd';
import { useSession } from 'next-auth/react';
const { Title } = Typography;

const ConfigWebsite = () => {
  const {data }= useSession()
  const { mutate, websiteConfigList, isLoading } = useConfigWebsite(data?.user?.email || '');
  return (
    <div>
      <Title level={4}>Config Website</Title>
      {isLoading ? (
        <Flex justify='center'>
          <Spin />
        </Flex>
      ) : null}
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {websiteConfigList
          ? websiteConfigList.map((item) => (
              <WebsiteItem key={item._id} website={item} refresh={mutate}/>
            ))
          : null}
      </Row>
      <UpdateWebsiteListModal refresh={mutate}/>
    </div>
  );
};

export default ConfigWebsite;
