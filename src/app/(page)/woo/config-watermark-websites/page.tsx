import { endpoint } from '@/constant/endpoint';
import { SWRProvider } from '@/provider/swr-provider';
import axios from 'axios';
import ConfigWatermarkWebsites from './ConfigWatermarkWebsites';

async function ConfigWatermarkWebsitesPage() {
  const getListCategories = async () => {
    try {
      const { data } = await axios.get(endpoint.categoryConfig);
      return data;
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const fallback = await getListCategories();

  return (
    <SWRProvider fallback={{ fallback }}>
      <ConfigWatermarkWebsites />
    </SWRProvider>
  );
}

export default ConfigWatermarkWebsitesPage;
