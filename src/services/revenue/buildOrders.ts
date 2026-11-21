import { resolveWooProductUrl } from "@/helper/productUrl";
import {
  extractWcpaOrderMeta,
  groupWcpaMetadata,
  metadataPairKey,
  normalizeMetadataPairs,
  type FormattedMetadataPair,
} from "@/helper/orderItemMetadata";
import { RevenueOrderProduct } from "@/types/revenue";
import { getOrderRefund, getOrderRevenue, isRevenueOrder } from "./orderStatus";

function getMetaValue(order: any, key: string) {
  return order.meta_data?.find((m: any) => m.key === key)?.value;
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dedupePairs(pairs: FormattedMetadataPair[]) {
  const seen = new Set<string>();
  const result: FormattedMetadataPair[] = [];

  for (const pair of pairs) {
    const key = metadataPairKey(pair);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(pair);
  }

  return result;
}

function collectPairKeys(
  grouping: ReturnType<typeof groupWcpaMetadata> | null
) {
  const keys = new Set<string>();
  if (!grouping) return keys;

  for (const pair of grouping.shared) keys.add(metadataPairKey(pair));

  for (const unit of grouping.units) {
    for (const pair of unit.pairs) keys.add(metadataPairKey(pair));
  }

  return keys;
}

function isAttributeMetaEntry(entry: any) {
  if (!entry || typeof entry !== "object") return false;

  const key = String(entry.key ?? "").toLowerCase();
  return (
    key.startsWith("pa_") ||
    key.startsWith("attribute_") ||
    key.startsWith("variation_")
  );
}

/**
 * Extract variation attributes and additional order item options from a line
 * item.
 *
 * WooCommerce does not include a normalized `variation` object on order line
 * items, so the attributes usually live in the public `meta_data` entries.
 * Some stores/plugins do expose `variation` directly, which is preferred when
 * present. Simple products never have variation attributes, but their public
 * metadata is still surfaced as additional options.
 *
 * Product add-on metadata (WCPA) is parsed separately so per-unit customization
 * fields are grouped onto the unit they belong to, and the duplicate flattened
 * entries are not repeated as options.
 */
function buildProductVariationData(
  item: any,
  variationId: number,
  quantity: number
) {
  const metaData: any[] = Array.isArray(item?.meta_data) ? item.meta_data : [];
  const wcpa = extractWcpaOrderMeta(metaData);
  const wcpaGrouping = wcpa ? groupWcpaMetadata(wcpa.value, quantity) : null;

  const wcpaMetaIds = new Set(wcpa?.metaIds ?? []);
  const publicMetaData = metaData.filter((entry) => {
    if (!wcpa) return true;

    const key = String(entry?.key ?? "").toLowerCase();
    if (
      key === "_wcpa_order_meta_data" ||
      key === "_wcpa_order_meta_key_label_map"
    ) {
      return false;
    }

    const id = Number(entry?.id);
    return !(Number.isFinite(id) && wcpaMetaIds.has(id));
  });

  const metaPairs = normalizeMetadataPairs(publicMetaData);
  const variationPairs = normalizeMetadataPairs(item?.variation);

  let attributes: FormattedMetadataPair[] = [];
  let options: FormattedMetadataPair[] = [];

  if (variationPairs.length) {
    const variationValues = new Set(variationPairs.map(metadataPairKey));

    attributes = variationPairs;
    options = metaPairs.filter(
      (pair) => !variationValues.has(metadataPairKey(pair))
    );
  } else if (variationId > 0) {
    const attributeMeta = publicMetaData.filter(isAttributeMetaEntry);
    const optionMeta = publicMetaData.filter(
      (entry) => !isAttributeMetaEntry(entry)
    );

    if (attributeMeta.length) {
      attributes = normalizeMetadataPairs(attributeMeta);
      options = normalizeMetadataPairs(optionMeta);
    } else if (!wcpa) {
      attributes = metaPairs;
    } else {
      options = normalizeMetadataPairs(optionMeta);
    }
  } else {
    options = metaPairs;
  }

  if (wcpaGrouping) {
    const wcpaPairKeys = collectPairKeys(wcpaGrouping);
    options = options.filter(
      (pair) => !wcpaPairKeys.has(metadataPairKey(pair))
    );
  }

  if (wcpaGrouping?.shared.length) {
    options = dedupePairs([...options, ...wcpaGrouping.shared]);
  }

  return {
    attributes,
    options,
    units: (wcpaGrouping?.units ?? []).map((unit) => ({
      index: unit.index,
      fields: unit.pairs,
    })),
  };
}

function getProductLink(item: any, websiteUrl?: string) {
  const resolved = resolveWooProductUrl(
    { permalink: item?.permalink, link: item?.link },
    websiteUrl
  );

  if (resolved) return resolved;

  const productId = Number(item?.product_id) || 0;
  const base = typeof websiteUrl === "string" ? websiteUrl.trim().replace(/\/+$/, "") : "";

  return productId && base ? `${base}/?p=${productId}` : "";
}

/**
 * Extract the order's products (image + public link) from `line_items`.
 *
 * WooCommerce returns the product image on the line item itself, but not a
 * permalink, so the link is rebuilt from the order's website URL.
 */
export function buildOrderProducts(
  order: any,
  websiteUrl?: string
): RevenueOrderProduct[] {
  const items: any[] = Array.isArray(order?.line_items)
    ? order.line_items
    : [];

  return items
    .map((item: any): RevenueOrderProduct => {
      const quantity = Number(item?.quantity) || 0;
      const variationId = Number(item?.variation_id) || 0;
      const unitPrice = toNumber(item?.price);
      const lineTotal =
        toNumber(item?.total) ??
        toNumber(item?.subtotal) ??
        (unitPrice !== undefined ? unitPrice * quantity : undefined);
      const { attributes, options, units } = buildProductVariationData(
        item,
        variationId,
        quantity
      );

      return {
        productId: Number(item?.product_id) || 0,
        name: String(item?.name || "").trim(),
        image: typeof item?.image?.src === "string" ? item.image.src : "",
        link: getProductLink(item, websiteUrl),
        quantity,
        ...(variationId ? { variationId } : {}),
        ...(item?.id ? { lineItemId: Number(item.id) } : {}),
        ...(typeof item?.sku === "string" && item.sku.trim()
          ? { sku: item.sku.trim() }
          : {}),
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        ...(lineTotal !== undefined ? { lineTotal } : {}),
        ...(attributes.length ? { attributes } : {}),
        ...(options.length ? { options } : {}),
        ...(units.length ? { units } : {}),
      };
    })
    .filter((product) => product.productId || product.name);
}

export function buildOrders(orders: any[]) {
  return orders
    .filter(isRevenueOrder)
    .sort(
      (a, b) =>
        new Date(a.date_created).getTime() -
        new Date(b.date_created).getTime()
    )
    .map((order) => {
      const refunded = getOrderRefund(order);
      const revenue = getOrderRevenue(order);
      const fee = Number(
        getMetaValue(order, "_cs_stripe_fee") ??
        getMetaValue(order, "_cs_paypal_fee") ??
        0
      );

      return {
        id: order.id,
        websiteId: order.websiteId ? order.websiteId.toString() : "",
        ownerEmail: order.ownerEmail || "",
        website: order.websiteName,
        customer: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        total: Number(order.total),
        refunded,
        revenue,
        fee,
        net: revenue - fee,
        status: order.status,
        date: order.date_created,
        paymentMethod: order.payment_method?.includes("stripe") ? "stripe" : "paypal",
        products: buildOrderProducts(order, order.websiteUrl),
      };
    });
}
