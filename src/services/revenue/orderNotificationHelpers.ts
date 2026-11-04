/**
 * Pure helpers for the Revenue order-notification cursor and Telegram message.
 *
 * WooCommerce returns `date_created_gmt` as a UTC timestamp but often without
 * an explicit `Z`, so it must be normalized before it can be compared with a
 * stored ISO cursor. `date_created` (site-local) is only a fallback.
 */
export const ORDER_CURSOR_OVERLAP_MS = 10 * 60 * 1000;

function toDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const date = new Date(hasTimezone ? raw : `${raw}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getOrderCreatedAt(order: any): Date {
  return toDate(order?.date_created_gmt) ?? toDate(order?.date_created) ?? new Date(0);
}

export function selectOrdersAfterCursor(orders: any[], cursor: string): any[] {
  const cursorTime = toDate(cursor)?.getTime();
  if (cursorTime === undefined) return [];

  return orders
    .filter((order) => getOrderCreatedAt(order).getTime() > cursorTime)
    .sort((a, b) => getOrderCreatedAt(a).getTime() - getOrderCreatedAt(b).getTime());
}

export function getLatestOrderCursor(orders: any[], fallback: string): string {
  const fallbackTime = toDate(fallback)?.getTime() ?? 0;
  let latest = fallbackTime;

  for (const order of orders) {
    latest = Math.max(latest, getOrderCreatedAt(order).getTime());
  }

  return new Date(latest).toISOString();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buildOrderNotificationMessage(websiteName: string, order: any): string {
  const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
  const products = lineItems.length
    ? lineItems
        .map((item: any) => {
          const name = escapeHtml(item?.name || "Item");
          const quantity = Number(item?.quantity) || 0;
          return `• ${name} x${quantity}`;
        })
        .join("\n")
    : "• N/A";

  const orderNumber = order?.number ?? order?.id ?? "";
  const total = order?.total ?? "";
  const currency = order?.currency ?? "";
  const paymentMethod =
    order?.payment_method_title || order?.payment_method || "N/A";
  const status = order?.status || "N/A";
  const createdAt = order?.date_created || order?.date_created_gmt || "N/A";

  return [
    "<b>New WooCommerce Order</b>",
    "",
    `Website: <b>${escapeHtml(websiteName)}</b>`,
    `Order: #${escapeHtml(orderNumber)}`,
    `Total: ${escapeHtml(total)} ${escapeHtml(currency)}`.trim(),
    `Payment: ${escapeHtml(paymentMethod)}`,
    `Status: ${escapeHtml(status)}`,
    `Created: ${escapeHtml(createdAt)}`,
    "",
    "Products:",
    products,
  ].join("\n");
}
