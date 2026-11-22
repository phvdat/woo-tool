import { calculateSummary } from "./calculateSummary";
import { groupRevenue, RevenueGroupBy } from "./groupRevenue";
import { groupWebsiteRevenue } from "./groupWebsiteRevenue";
import { aggregateProductStats } from "./aggregateProducts";
import { findRevenueHistory } from "./revenueHistory";
import { getAccessibleWebsiteIds } from "./websiteAccess";

export interface LoadRevenueHistoryParams {
  websiteId?: string;
  userEmail: string;
  from: string;
  to: string;
  groupBy: RevenueGroupBy;
  search?: string;
}

/**
 * Build the Revenue page payload from persisted Revenue History.
 *
 * Access is resolved from the `websites` collection, so both owners and
 * members see the revenue for the websites they can access.
 *
 * History rows are stored in the same shape `buildOrders` emits, so the exact
 * same aggregation helpers are reused here — no duplicated aggregation logic.
 */
export async function loadRevenueHistory({
  websiteId,
  userEmail,
  from,
  to,
  groupBy,
  search,
}: LoadRevenueHistoryParams) {
  const websiteIds = await getAccessibleWebsiteIds(userEmail);

  const records = await findRevenueHistory({
    websiteId,
    userEmail,
    websiteIds,
    from,
    to,
    search,
  });

  const orders = records.map((record) => ({
    id: record.orderId,
    websiteId: record.websiteId,
    website: record.website,
    customer: record.customer,
    total: record.total,
    refunded: record.refunded,
    revenue: record.revenue,
    fee: record.fee,
    net: record.net,
    status: record.status,
    date: record.date,
    paymentMethod: record.paymentMethod,
    products: record.products ?? [],
  }));

  return {
    summary: calculateSummary(orders),
    chart: groupRevenue(orders, groupBy),
    websiteStats: groupWebsiteRevenue(orders),
    productStats: aggregateProductStats(orders),
    latestOrders: orders,
  };
}
