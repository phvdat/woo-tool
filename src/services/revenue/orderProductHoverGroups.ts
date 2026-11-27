import { sanitizeMetadataText } from "@/helper/orderItemMetadata";
import {
  RevenueOrderProduct,
  RevenueProductAttribute,
  RevenueProductStat,
} from "@/types/revenue";
import { getOrderProductQuantity } from "./orderProductQuantity";

export interface OrderProductHoverSection {
  /** 1-based position of this physical unit within the grouped product. */
  index: number;
  attributes: RevenueProductAttribute[];
  options: RevenueProductAttribute[];
}

export interface OrderProductHoverGroup {
  key: string;
  /** Representative line item, used for the image, name and link. */
  product: RevenueOrderProduct;
  /** Sum of every line item in this group; never deduped by product identity. */
  quantity: number;
  /** One section per line item, or per WCPA unit when per-unit data exists. */
  sections: OrderProductHoverSection[];
}

const DEFAULT_INSURANCE_VALUE =
  /order insurance\b.*priority processing and 100% value coverage/i;

function cleanPairs(pairs: RevenueProductAttribute[] | undefined) {
  const seen = new Set<string>();
  const result: RevenueProductAttribute[] = [];

  for (const pair of pairs ?? []) {
    const name = sanitizeMetadataText(pair?.name);
    const value = sanitizeMetadataText(pair?.value);
    if (!name || !value) continue;

    const normalizedName = name.toLowerCase();
    // WCPA's empty-label field carries the default Order Insurance text. The
    // generic parser drops the internal key, but legacy rows can still carry
    // a flattened pair, so filter that noise here too.
    if (
      normalizedName === "wcpa empty label" ||
      normalizedName === "wcpa_empty_label" ||
      DEFAULT_INSURANCE_VALUE.test(`${name} ${value}`)
    ) {
      continue;
    }

    const key = `${normalizedName}|${value.toLowerCase()}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({ name, value });
  }

  return result;
}

function buildGroupKey(product: RevenueOrderProduct) {
  const id = Number(product?.productId) || 0;
  const name = sanitizeMetadataText(product?.name).toLowerCase();

  return id ? `id:${id}:${name}` : `name:${name}`;
}

function buildSections(product: RevenueOrderProduct) {
  const units = Array.isArray(product.units) ? product.units : [];
  const attributes = cleanPairs(product.attributes);
  const options = cleanPairs(product.options);

  if (units.length) {
    return units.map((unit) => ({
      attributes,
      options: cleanPairs([...options, ...(unit.fields ?? [])]),
    }));
  }

  return [{ attributes, options }];
}

/**
 * Build the hover model for the products of a single order.
 *
 * Line items sharing a product are one hover card with a summed quantity, but
 * their metadata is kept in separate sections: two size-9/size-10 units must
 * never collapse into a single option list. Distinct products stay distinct.
 */
export function buildOrderProductHoverGroups(
  products: RevenueOrderProduct[],
  getStat?: (product: RevenueOrderProduct) => RevenueProductStat | undefined
): OrderProductHoverGroup[] {
  const groups: OrderProductHoverGroup[] = [];
  const byKey = new Map<string, OrderProductHoverGroup>();

  for (const product of products ?? []) {
    if (!product) continue;

    const key = buildGroupKey(product);
    let group = byKey.get(key);

    if (!group) {
      group = { key, product, quantity: 0, sections: [] };
      byKey.set(key, group);
      groups.push(group);
    }

    group.quantity += getOrderProductQuantity(product);

    for (const section of buildSections(product)) {
      group.sections.push({ index: 0, ...section });
    }
  }

  for (const group of groups) {
    const hasMetadata = group.sections.some(
      (section) => section.attributes.length || section.options.length
    );

    if (!hasMetadata) {
      const stat = getStat?.(group.product);
      if (stat) {
        const attributes = cleanPairs(
          (stat.variants ?? []).flatMap((variant) => variant.attributes ?? [])
        );
        const options = cleanPairs(
          (stat.options ?? []).map((option) => ({
            name: option.name,
            value: option.value,
          }))
        );

        if (attributes.length || options.length) {
          const fallback = { index: 0, attributes, options };
          if (group.sections.length) {
            group.sections[0] = fallback;
          } else {
            group.sections.push(fallback);
          }
        }
      }
    }

    group.sections.forEach((section, index) => {
      section.index = index + 1;
    });
  }

  return groups;
}
