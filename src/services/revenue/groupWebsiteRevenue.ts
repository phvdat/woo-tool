export function groupWebsiteRevenue(orders: any[]) {
  const map = new Map<
    string,
    {
      website: string;
      revenue: number;
      orders: number;
      averageOrderValue: number;
    }
  >();

  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "failed") {
      continue;
    }

    const key = order.websiteName;
    const revenue = Number(order.total || 0);

    if (!map.has(key)) {
      map.set(key, {
        website: key,
        revenue: 0,
        orders: 0,
        averageOrderValue: 0,
      });
    }

    const item = map.get(key)!;
    item.revenue += revenue;
    item.orders++;
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      averageOrderValue:
        item.orders === 0
          ? 0
          : item.revenue / item.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}