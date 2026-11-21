import { sanitizeMetadataText } from "@/helper/orderItemMetadata";
import {
  RevenueOrderProduct,
  RevenueProductAttribute,
  RevenueProductOptionStat,
  RevenueProductStat,
  RevenueProductVariantStat,
} from "@/types/revenue";

interface AggregatableOrder {
  id?: number | string;
  websiteId?: string;
  products?: RevenueOrderProduct[];
}

interface MutableProductStat extends RevenueProductStat {
  priceQuantity: number;
  variantMap: Map<string, RevenueProductVariantStat>;
  optionMap: Map<string, RevenueProductOptionStat>;
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Stable lookup key used by both the aggregation and the Revenue table.
 *
 * Product ids are only unique inside a single store, so the website id is part
 * of the key. Products without an id fall back to their name.
 */
export function buildProductStatKey(
  websiteId: string | undefined,
  productId: number | undefined,
  name: string | undefined
) {
  const scope = websiteId || "all";
  const id = Number(productId) || 0;
  const identity = id
    ? `id:${id}`
    : `name:${String(name || "").trim().toLowerCase()}`;

  return `${scope}:${identity}`;
}

function normalizeAttributes(
  attributes: RevenueProductAttribute[] | undefined
): RevenueProductAttribute[] {
  if (!Array.isArray(attributes)) return [];

  const seen = new Set<string>();
  const result: RevenueProductAttribute[] = [];

  for (const attribute of attributes) {
    const name = sanitizeMetadataText(attribute?.name);
    const value = sanitizeMetadataText(attribute?.value);
    if (!name || !value) continue;

    const key = `${name.toLowerCase()}:${value.toLowerCase()}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({ name, value });
  }

  return result;
}

function buildVariantKey(attributes: RevenueProductAttribute[]) {
  return attributes
    .map((attribute) => `${attribute.name.toLowerCase()}:${attribute.value.toLowerCase()}`)
    .sort()
    .join("|");
}

function buildVariantLabel(attributes: RevenueProductAttribute[]) {
  return attributes.map((attribute) => attribute.value).join(" / ");
}

function buildOptionKey(attribute: RevenueProductAttribute) {
  return `${attribute.name.toLowerCase()}:${attribute.value.toLowerCase()}`;
}

function buildOptionLabel(attribute: RevenueProductAttribute) {
  return `${attribute.name}: ${attribute.value}`;
}

/**
 * Aggregate line items across the filtered order history.
 *
 * Orders are deduped by `websiteId + orderId`, and line items by their Woo
 * line item id, so overlapping or repeated records cannot inflate quantities.
 * Variants are grouped by their full attribute combination, which keeps the
 * per-variant quantities from double-counting products that have several
 * attributes (Size + Color).
 */
export function aggregateProductStats(
  orders: AggregatableOrder[]
): RevenueProductStat[] {
  const stats = new Map<string, MutableProductStat>();
  const seenOrders = new Set<string>();

  for (const order of orders) {
    const websiteId = String(order?.websiteId || "");
    const hasOrderId = order?.id !== undefined && order?.id !== null;
    const orderKey = hasOrderId ? `${websiteId}:${order.id}` : "";

    if (orderKey) {
      if (seenOrders.has(orderKey)) continue;
      seenOrders.add(orderKey);
    }

    const orderProducts = Array.isArray(order?.products) ? order.products : [];
    const countedProducts = new Set<string>();
    const seenLineItems = new Set<string>();

    for (const product of orderProducts) {
      const name = String(product?.name || "").trim();
      const productId = Number(product?.productId) || 0;

      if (!productId && !name) continue;

      const key = buildProductStatKey(websiteId, productId, name);

      if (product.lineItemId !== undefined && product.lineItemId !== null) {
        const lineKey = `${key}:${product.lineItemId}`;
        if (seenLineItems.has(lineKey)) continue;
        seenLineItems.add(lineKey);
      }

      let stat = stats.get(key);

      if (!stat) {
        stat = {
          key,
          websiteId,
          productId,
          name,
          image: "",
          link: "",
          sku: "",
          quantity: 0,
          revenue: 0,
          unitPrice: 0,
          orders: 0,
          isVariable: false,
          variants: [],
          options: [],
          priceQuantity: 0,
          variantMap: new Map<string, RevenueProductVariantStat>(),
          optionMap: new Map<string, RevenueProductOptionStat>(),
        };
        stats.set(key, stat);
      }

      if (!stat.name && name) stat.name = name;
      if (!stat.image && product.image) stat.image = product.image;
      if (!stat.link && product.link) stat.link = product.link;
      if (!stat.sku && product.sku) stat.sku = product.sku;

      const quantity = Number(product.quantity) || 0;
      const unitPrice =
        toNumber(product.unitPrice) ??
        (quantity ? (toNumber(product.lineTotal) ?? 0) / quantity : 0);
      const lineRevenue =
        toNumber(product.lineTotal) ?? unitPrice * quantity;

      stat.quantity += quantity;
      stat.revenue += lineRevenue;

      if (unitPrice > 0) {
        stat.priceQuantity += unitPrice * quantity;
      }

      if (!countedProducts.has(key)) {
        countedProducts.add(key);
        stat.orders += 1;
      }

      const attributes = normalizeAttributes(product.attributes);
      const options = normalizeAttributes(product.options);

      if (product.variationId || attributes.length) {
        stat.isVariable = true;
      }

      for (const option of options) {
        const optionKey = buildOptionKey(option);
        let optionStat = stat.optionMap.get(optionKey);

        if (!optionStat) {
          optionStat = {
            key: optionKey,
            name: option.name,
            value: option.value,
            label: buildOptionLabel(option),
            quantity: 0,
          };
          stat.optionMap.set(optionKey, optionStat);
        }

        optionStat.quantity += quantity;
      }

      if (!attributes.length) continue;

      const variantKey = buildVariantKey(attributes);
      let variant = stat.variantMap.get(variantKey);

      if (!variant) {
        variant = {
          key: variantKey,
          label: buildVariantLabel(attributes),
          attributes,
          quantity: 0,
          revenue: 0,
        };
        stat.variantMap.set(variantKey, variant);
      }

      variant.quantity += quantity;
      variant.revenue += lineRevenue;

      if (!variant.sku && product.sku) variant.sku = product.sku;
    }
  }

  return Array.from(stats.values())
    .map((stat) => ({
      key: stat.key,
      websiteId: stat.websiteId,
      productId: stat.productId,
      name: stat.name,
      image: stat.image,
      link: stat.link,
      sku: stat.sku,
      quantity: stat.quantity,
      revenue: stat.revenue,
      unitPrice:
        stat.priceQuantity > 0 && stat.quantity > 0
          ? stat.priceQuantity / stat.quantity
          : stat.quantity > 0
            ? stat.revenue / stat.quantity
            : 0,
      orders: stat.orders,
      isVariable: stat.isVariable,
      variants: Array.from(stat.variantMap.values()).sort(
        (a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label)
      ),
      options: Array.from(stat.optionMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
