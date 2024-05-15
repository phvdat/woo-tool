import { endpoint } from '@/constant/endpoint';
import { SWRProvider } from '@/provider/swr-provider';
import axios from 'axios';
import ConfigCategories from './ConfigCategories';

async function ConfigCategoriesPage() {
  const getListCategories = async () => {
    try {
      const { data } = await axios.get(endpoint.category);
      return data;
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const fallback = await getListCategories();

  return (
    <SWRProvider fallback={{ fallback }}>
      <ConfigCategories />
    </SWRProvider>
  );
}

export default ConfigCategoriesPage;
