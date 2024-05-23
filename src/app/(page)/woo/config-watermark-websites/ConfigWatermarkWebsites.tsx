'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkWebsites } from '@/app/hooks/useWatermarkWebsites';
import UpdateWatermarkList from '@/components/woo/UpdateWatermarkList';
import WatermarkWebsiteItem from '@/components/woo/WatermarkWebsiteItem';
import { Row } from 'antd';

const ConfigWatermarkWebsites = () => {
  const { watermarkWebsites } = useWatermarkWebsites();
  return (
    <div>
      <h1>Config Watermark</h1>
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {watermarkWebsites
          ? watermarkWebsites.map((watermark) => (
              <WatermarkWebsiteItem key={watermark._id} watermark={watermark} />
            ))
          : null}
      </Row>
      <UpdateWatermarkList />
    </div>
  );
};

export default ConfigWatermarkWebsites;
