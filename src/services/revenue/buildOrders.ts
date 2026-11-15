import { resolveWooProductUrl } from "@/helper/productUrl";
import { RevenueOrderProduct } from "@/types/revenue";
import { getOrderRefund, getOrderRevenue, isRevenueOrder } from "./orderStatus";

function getMetaValue(order: any, key: string) {
  return order.meta_data?.find((m: any) => m.key === key)?.value;
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
    .map((item: any): RevenueOrderProduct => ({
      productId: Number(item?.product_id) || 0,
      name: String(item?.name || "").trim(),
      image: typeof item?.image?.src === "string" ? item.image.src : "",
      link: getProductLink(item, websiteUrl),
      quantity: Number(item?.quantity) || 0,
    }))
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
