import { getOrderRefund, getOrderRevenue, isRevenueOrder } from "./orderStatus";

function getMetaValue(order: any, key: string) {
  return order.meta_data?.find((m: any) => m.key === key)?.value;
}

export function buildOrders(orders: any[]) {
  return orders
    .filter(isRevenueOrder)
    .sort(
      (a, b) =>
        new Date(a.date_created).getTime() -
        new Date(b.date_created).getTime()
    )
    .map((order) => {
      const refunded = getOrderRefund(order);
      const revenue = getOrderRevenue(order);
      const fee = Number(
        getMetaValue(order, "_cs_stripe_fee") ??
        getMetaValue(order, "_cs_paypal_fee") ??
        0
      );

      return {
        id: order.id,
        website: order.websiteName,
        customer: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        total: Number(order.total),
        refunded,
        revenue,
        fee,
        net: revenue - fee,
        status: order.status,
        date: order.date_created,
        paymentMethod: order.payment_method?.includes("stripe") ? "stripe" : "paypal"
      };
    });
}
