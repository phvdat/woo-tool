'use client';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import UpdateWatermarkList from '@/components/woo/UpdateWatermarkListModal';
import WatermarkWebsiteItem from '@/components/woo/WatermarkWebsiteItem';
import { Flex, Row, Spin, Typography } from 'antd';
const { Title } = Typography;

const ConfigWatermark = () => {
  const { watermarkConfig, isLoading } = useWatermarkConfig();
  return (
    <div>
      <Title level={4}>Config Watermark</Title>
      {isLoading ? (
        <Flex justify='center'>
          <Spin />
        </Flex>
      ) : null}
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {watermarkConfig
          ? watermarkConfig.map((watermark) => (
              <WatermarkWebsiteItem key={watermark._id} watermark={watermark} />
            ))
          : null}
      </Row>
      <UpdateWatermarkList />
    </div>
  );
};

export default ConfigWatermark;
