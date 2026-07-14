export function calculateSummary(orders: any[]) {
  const validOrders = orders.filter(
    (order) =>
      order.status !== "cancelled" &&
      order.status !== "failed"
  );

  const revenue = validOrders.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  return {
    totalRevenue: revenue,
    totalOrders: validOrders.length,
    averageOrderValue: validOrders.length
      ? revenue / validOrders.length
      : 0,
  };
}