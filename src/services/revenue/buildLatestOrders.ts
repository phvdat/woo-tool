export function buildLatestOrders(orders: any[]) {
  return orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        order.status !== "failed"
    )
    .sort(
      (a, b) =>
        new Date(b.date_created).getTime() -
        new Date(a.date_created).getTime()
    )
    .slice(0, 10)
    .map((order) => ({
      id: order.id,
      website: order.websiteName,
      customer: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      total: Number(order.total),
      status: order.status,
      date: order.date_created,
    }));
}