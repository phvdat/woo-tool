import { loadOrders } from "./loadOrders";
import { calculateSummary } from "./calculateSummary";
import { groupRevenue, RevenueGroupBy } from "./groupRevenue";
import { groupWebsiteRevenue } from "./groupWebsiteRevenue";
import { buildLatestOrders } from "./buildLatestOrders";

interface LoadRevenueParams {
  websiteId?: string;
  userEmail: string;
  from: string;
  to: string;
  groupBy: RevenueGroupBy;
}

export async function loadRevenue({
  websiteId,
  userEmail,
  from,
  to,
  groupBy,
}: LoadRevenueParams) {
  const orders = await loadOrders({
    websiteId,
    userEmail,
    from,
    to,
  });

  return {
    summary: calculateSummary(orders),
    chart: groupRevenue(orders, groupBy),
    websiteStats: groupWebsiteRevenue(orders),
    latestOrders: buildLatestOrders(orders),
  };
}