function getMetaValue(order: any, key: string) {
  return order.meta_data?.find((m: any) => m.key === key)?.value;
}

export function buildOrders(orders: any[]) {
  return orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        order.status !== "failed"
    )
    .sort(
      (a, b) =>
        new Date(a.date_created).getTime() -
        new Date(b.date_created).getTime()
    )
    .map((order) => ({
      id: order.id,
      website: order.websiteName,
      customer: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      total: Number(order.total),
      fee: Number(
        getMetaValue(order, "_cs_stripe_fee") ??
        getMetaValue(order, "_cs_paypal_fee") ??
        0
      ),
      net: Number(
        getMetaValue(order, "_cs_stripe_payout") ??
        getMetaValue(order, "_cs_paypal_payout") ??
        0
      ),
      status: order.status,
      date: order.date_created,
    }));
}