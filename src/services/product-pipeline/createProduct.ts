import dayjs from "dayjs";
import { AxiosInstance } from "axios";
import { WooCommerce } from "@/types/woo";

export interface WooCategoryMap {
  [path: string]: number;
}

interface CreateProductParams {
  woo: AxiosInstance;
  product: WooCommerce;
  categoryMap: WooCategoryMap;
}

interface ProcessedStyleData {
  indices: number[];
  names: string[];
}

const STYLE_ATTRIBUTE_NAME = "Choose Your Style";

interface WooAttribute {
  id: number;
  name: string;
  slug: string;
}

async function getStyleAttributeId(woo: AxiosInstance): Promise<number> {
  let page = 1;
  while (true) {
    const { data } = await woo.get<WooAttribute[]>(
      "/products/attributes",
      { params: { per_page: 100, page } },
    );
    if (!data.length) break;
    const found = data.find((a) => a.name === STYLE_ATTRIBUTE_NAME);
    if (found) return found.id;
    page++;
  }
  throw new Error(
    `Global attribute "${STYLE_ATTRIBUTE_NAME}" not found in WooCommerce. Please create it first.`,
  );
}

interface WooAttributeTerm {
  id: number;
  name: string;
  slug: string;
}

async function findOrCreateAttributeTerm(
  woo: AxiosInstance,
  attributeId: number,
  termName: string,
): Promise<number> {
  let page = 1;
  while (true) {
    const { data } = await woo.get<WooAttributeTerm[]>(
      `/products/attributes/${attributeId}/terms`,
      { params: { per_page: 100, page } },
    );
    if (!data.length) break;
    const found = data.find((t) => t.name === termName);
    if (found) return found.id;
    if (data.length < 100) break;
    page++;
  }

  try {
    const { data: created } = await woo.post<WooAttributeTerm>(
      `/products/attributes/${attributeId}/terms`,
      { name: termName },
    );
    return created.id;
  } catch (err: any) {
    if (err?.response?.data?.code === "term_exists") {
      return err.response.data.data.term_id;
    }
    throw err;
  }
}

export async function createProduct({
  woo,
  product,
  categoryMap,
}: CreateProductParams) {
  const local = dayjs(product["Published Date"]).utcOffset(7, true);
  const images = (product.Images ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => ({ src }));

  const styleDataRaw = product["Choose Your Style Data"];
  const hasStyles = !!styleDataRaw && styleDataRaw.trim().length > 0;

  const basePayload: Record<string, any> = {
    name: product.Name,
    status: "future",
    date_created: local.format("YYYY-MM-DDTHH:mm:ss"),
    date_created_gmt: local.utc().format("YYYY-MM-DDTHH:mm:ss"),
    description: product.Description,
    short_description: product["Short description"],
    sku: product.SKU,
    categories: categoryMap[product.Categories]
      ? [{ id: categoryMap[product.Categories] }]
      : [],
    tags: product.Tags?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name })) ?? [],
    images,
    catalog_visibility: "visible",
  };

  if (!hasStyles) {
    const payload = {
      ...basePayload,
      type: "simple",
      regular_price: product["Regular price"],
      sale_price: product["Sale price"] || undefined,
      stock_quantity: product["Stock"] || undefined,
      manage_stock: !!product["Stock"],
      stock_status: product["Stock"] ? "instock" : undefined,
    };
    const { data } = await woo.post("/products", payload);
    return data;
  }

  const styleData: ProcessedStyleData = JSON.parse(styleDataRaw!);
  const attributeId = await getStyleAttributeId(woo);

  await Promise.all(
    styleData.names.map((name) =>
      findOrCreateAttributeTerm(woo, attributeId, name),
    ),
  );

  const parentPayload = {
    ...basePayload,
    type: "variable",
    attributes: [
      {
        id: attributeId,
        name: STYLE_ATTRIBUTE_NAME,
        position: 0,
        visible: true,
        variation: true,
        options: styleData.names,
      },
    ],
  };

  const { data: parentProduct } = await woo.post("/products", parentPayload);

  const wcImages: { id: number; src: string }[] = parentProduct.images ?? [];

  for (let i = 0; i < styleData.indices.length; i++) {
    const imageIndex = styleData.indices[i];
    const styleName = styleData.names[i];
    const wcImage = wcImages[imageIndex - 1];

    if (!wcImage) {
      throw new Error(
        `No WooCommerce image found for index ${imageIndex} on product "${product.Name}"`,
      );
    }

    const variationPayload = {
      regular_price: product["Regular price"],
      sale_price: product["Sale price"] || undefined,
      stock_status: "instock" as const,
      manage_stock: false,
      attributes: [
        {
          id: attributeId,
          option: styleName,
        },
      ],
      image: { id: wcImage.id },
    };

    await woo.post(
      `/products/${parentProduct.id}/variations`,
      variationPayload,
    );
  }

  return parentProduct;
}
