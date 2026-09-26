import dayjs from "dayjs";

export type RevenueGroupBy = "hour" | "day" | "month";

export function groupRevenue(
  orders: any[],
  groupBy: RevenueGroupBy
) {
  const map = new Map<string, number>();

  for (const order of orders) {
    const date = dayjs(order.date ?? order.date_created);

    let key = "";

    switch (groupBy) {
      case "hour":
        key = date.format("YYYY-MM-DD HH:00");
        break;
      case "month":
        key = date.format("YYYY-MM");
        break;
      default:
        key = date.format("YYYY-MM-DD");
    }

    map.set(
      key,
      (map.get(key) || 0) + Number(order.revenue ?? order.total ?? 0)
    );
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, revenue]) => ({
      time,
      revenue,
    }));
}
