import { loadOrders } from "./loadOrders";
import { calculateSummary } from "./calculateSummary";
import { groupRevenue, RevenueGroupBy } from "./groupRevenue";
import { groupWebsiteRevenue } from "./groupWebsiteRevenue";
import { buildOrders } from "./buildOrders";

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
  const formatOrder = buildOrders(orders)
  return {
    summary: calculateSummary(formatOrder),
    chart: groupRevenue(orders, groupBy),
    websiteStats: groupWebsiteRevenue(orders),
    latestOrders: formatOrder,
  };
}