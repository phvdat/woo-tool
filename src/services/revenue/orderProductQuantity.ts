import { RevenueOrderProduct } from "@/types/revenue";

/**
 * Quantity of one order line item, as stored on the revenue history record.
 *
 * `productStats.quantity` is a total across every order in the filtered result
 * set. It is not the quantity of the line item being hovered, and using it for
 * that purpose makes the displayed quantity change with the product-name
 * search filter. The line item snapshot is the only source of truth here.
 */
export function getOrderProductQuantity(
  product: Pick<RevenueOrderProduct, "quantity">
): number {
  const quantity = Number(product?.quantity);
  return Number.isFinite(quantity) ? quantity : 0;
}
