'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import UpdateWatermarkList from '@/components/woo/UpdateWatermarkList';
import WatermarkWebsiteItem from '@/components/woo/WatermarkWebsiteItem';
import { Row } from 'antd';

const ConfigWatermark = () => {
  const { watermarkConfig } = useWatermarkConfig();
  return (
    <div>
      <h1>Config Watermark</h1>
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
