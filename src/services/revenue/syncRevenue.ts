import { loadOrders } from "./loadOrders";
import { buildOrders } from "./buildOrders";
import { saveRevenueHistory, SaveRevenueHistoryResult } from "./revenueHistory";

export interface SyncRevenueParams {
  /** Omit to sync every configured website (the cron). */
  userEmail?: string;
}

export interface SyncRevenueResult extends SaveRevenueHistoryResult {
  fetched: number;
}

/**
 * Fetch the full order dataset from WooCommerce and upsert it into Revenue
 * History. Shared by the cron job and the Revenue page's manual Refresh, so
 * both paths stay identical.
 *
 * Deliberately unbounded rather than using a lookback window: if the cron is
 * down for longer than the window, a time-based lookback would permanently
 * skip whatever fell in the gap. A full sync always recovers missed runs, and
 * the `websiteId + orderId` upsert makes re-reading everything idempotent.
 */
export async function syncRevenue({
  userEmail,
}: SyncRevenueParams = {}): Promise<SyncRevenueResult> {
  const rawOrders = await loadOrders({ userEmail });

  const records = buildOrders(rawOrders);
  const saved = await saveRevenueHistory(records);

  return { ...saved, fetched: rawOrders.length };
}
