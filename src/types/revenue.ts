export type RevenuePaymentMethod = "stripe" | "paypal";

/**
 * A single persisted revenue record in the `revenue_history` collection.
 *
 * The fields mirror exactly what the Revenue page displays (see
 * `buildOrders`), so history rows can be re-aggregated with the existing
 * `calculateSummary` / `groupRevenue` / `groupWebsiteRevenue` helpers without
 * any extra transformation.
 *
 * Records are keyed by `websiteId` + `orderId` so re-syncing the same order is
 * an upsert instead of a duplicate insert.
 */
export interface RevenueHistoryRecord {
  /** Stringified `websites._id` the order belongs to. */
  websiteId: string;
  /**
   * Denormalized `websites.owner` captured at sync time so history stays
   * readable after the website itself is deleted.
   */
  ownerEmail: string;
  /** WooCommerce order id. */
  orderId: number;
  /** Display name of the website (`websites.shopName`). */
  website: string;
  customer: string;
  total: number;
  refunded: number;
  revenue: number;
  fee: number;
  net: number;
  status: string;
  /** Raw WooCommerce `date_created` string, kept as-is for display. */
  date: string;
  paymentMethod: RevenuePaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}
