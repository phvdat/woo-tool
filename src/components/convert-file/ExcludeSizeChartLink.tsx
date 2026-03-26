import { Product } from "@/app/(page)/convert-file/ConvertFile"
import { ApiOutlined } from "@ant-design/icons"
import { Button, Flex, Popover } from "antd"
import TextArea from "antd/es/input/TextArea"
import { useGlobalSizeChartLinks } from "@/app/hooks/useGlobalSizeChartLinks"

const ExcludeSizeChartLink = ({
  products,
  setProducts
}: {
  products: Product[],
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
}) => {

  const { sizeChartLinks, save } = useGlobalSizeChartLinks()

  const textValue = sizeChartLinks.join('\n')

  const handleSave = async (value: string) => {
    const links = value
      .split('\n')
      .map(i => i.trim())
      .filter(Boolean)

    await save(links)
  }

  const handleRemoveSizeChartLink = () => {

    const newProducts = products.map(product => {

      const newImages = product.Images
        .split(',')
        .map(img => img.trim())
        .filter(img => img && !sizeChartLinks.includes(img))
        .join(',')

      return { ...product, Images: newImages }

    })

    setProducts(newProducts)
  }

  return (
    <Flex gap={12}>

      <Popover
        content={
          <TextArea
            rows={6}
            style={{ width: 400 }}
            defaultValue={textValue}
            onBlur={(e)=>handleSave(e.target.value)}
          />
        }
        trigger="click"
      >
        <ApiOutlined />
      </Popover>

      <Button onClick={handleRemoveSizeChartLink}>
        Remove Size Link
      </Button>

    </Flex>
  )
}

export default ExcludeSizeChartLink