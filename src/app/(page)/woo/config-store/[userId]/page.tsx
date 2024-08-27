import ConfigStore from './ConfigStore';

async function ConfigStorePage({ params }: { params: { userId: string } }) {
  return <ConfigStore userId={params.userId} />;
}

export default ConfigStorePage;
