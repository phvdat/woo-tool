import { AxiosInstance } from "axios";

export type CategoryMap = Record<string, number>;

interface WooCategory {
  id: number;
  name: string;
  parent: number;
}

export async function loadCategories(
  woo: AxiosInstance,
): Promise<CategoryMap> {
  const categories: WooCategory[] = [];
  let page = 1;

  while (true) {
    const { data } = await woo.get<WooCategory[]>("/products/categories", {
      params: {
        per_page: 100,
        page,
      },
    });

    if (!data.length) break;

    categories.push(...data);
    page++;
  }

  const map: CategoryMap = {};

  const getPath = (category: WooCategory): string => {
    if (category.parent === 0) return category.name;

    const parent = categories.find((c) => c.id === category.parent);

    if (!parent) return category.name;

    return `${getPath(parent)} > ${category.name}`;
  };

  for (const category of categories) {
    map[getPath(category)] = category.id;
  }

  return map;
}