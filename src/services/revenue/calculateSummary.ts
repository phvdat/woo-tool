export function calculateSummary(orders: any[]) {
  const totalRevenue = orders.reduce(
    (sum, item) => sum + Number(item.revenue ?? item.total ?? 0),
    0
  );
  const totalFees = orders.reduce(
    (sum, item) => sum + Number(item.fee || 0),
    0
  );
  const totalNet = orders.reduce(
    (sum, item) => sum + Number(item.net || 0),
    0
  );
  const totalRefunded = orders.reduce(
    (sum, item) => sum + Number(item.refunded || 0),
    0
  );
  return {
    totalRevenue,
    totalFees,
    totalNet,
    totalRefunded,
    totalOrders: orders.length,
    averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
  };
}
