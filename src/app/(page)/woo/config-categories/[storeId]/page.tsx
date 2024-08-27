import ConfigCategories from './ConfigCategories';

async function ConfigCategoriesPage({
  params,
}: {
  params: { storeId: string };
}) {
  console.log(params);

  return <ConfigCategories storeId={params.storeId} />;
}

export default ConfigCategoriesPage;
