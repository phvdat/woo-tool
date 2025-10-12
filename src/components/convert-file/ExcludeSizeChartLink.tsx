import { Product } from "@/app/(page)/convert-file/ConvertFile"
import { useLocalStorage } from "@/app/hooks/useLocalStorage"
import { ApiOutlined } from "@ant-design/icons"
import { Button, Flex, Popover } from "antd"
import TextArea from "antd/es/input/TextArea"

const SIZE_CHART_LINK ='SIZE_CHART_LINK'

const ExcludeSizeChartLink = ({products, setProducts}: {products: Product[], setProducts: React.Dispatch<React.SetStateAction<Product[]>>})=>{
  const [sizeChartLinks, setSizeChartLinks] = useLocalStorage(SIZE_CHART_LINK, '')

  const handleRemoveSizeChartLink = () => {
  const linksToRemove = sizeChartLinks
    .split('\n')
    .map(link => link.trim())
    .filter(Boolean);

  const newProducts = products.map(product => {
    const newImages = product.Images
      .split(',')
      .map(img => img.trim())
      .filter(img => img && !linksToRemove.includes(img))
      .join(',');

    return { ...product, Images: newImages };
  });

  setProducts(newProducts);
};

  return <Flex gap={12}>
    <Popover content={<TextArea style={{width: '100%'}} rows={5} placeholder="Size chart links image" value={sizeChartLinks} onChange={(e)=>setSizeChartLinks(e.target.value)}/>} title="Title" trigger="click">
      <ApiOutlined />
    </Popover>
    <Button onClick={handleRemoveSizeChartLink}>Remove Size Link</Button>
  </Flex>
}

export default ExcludeSizeChartLink