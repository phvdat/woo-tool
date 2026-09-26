export type WooOrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "checkout-draft";

const EXCLUDED_REVENUE_STATUSES = new Set(["cancelled", "failed", "trash"]);

export function isRevenueOrder(order: any) {
  return !EXCLUDED_REVENUE_STATUSES.has(order?.status);
}

function getRefundRecords(order: any): any[] {
  return Array.isArray(order?.refunds) ? order.refunds : [];
}

export function getOrderRefund(order: any) {
  const total = Number(order?.total || 0);

  const refunded = getRefundRecords(order).reduce(
    (sum, refund) => sum + Math.abs(Number(refund?.total ?? refund?.amount ?? 0) || 0),
    0
  );

  if (refunded > 0) {
    return Math.min(refunded, total);
  }

  return order?.status === "refunded" ? total : 0;
}

export function getOrderRevenue(order: any) {
  return Math.max(Number(order?.total || 0) - getOrderRefund(order), 0);
}
