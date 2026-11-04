import { loadOrders } from "./loadOrders";
import { buildOrders } from "./buildOrders";
import { saveRevenueHistory, SaveRevenueHistoryResult } from "./revenueHistory";
import { processNewOrderNotifications } from "./orderNotifications";
import { getErrorMessage } from "@/lib/error-utils";

export interface SyncRevenueParams {
  /** Omit to sync every configured website (the cron). */
  userEmail?: string;
  /**
   * Cron-only: detect newly created WooCommerce orders and notify Telegram.
   * Manual page Refresh deliberately leaves this off.
   */
  notifyNewOrders?: boolean;
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
  notifyNewOrders = false,
}: SyncRevenueParams = {}): Promise<SyncRevenueResult> {
  const rawOrders = await loadOrders({ userEmail });

  const records = buildOrders(rawOrders);
  const saved = await saveRevenueHistory(records);

  if (notifyNewOrders) {
    try {
      const result = await processNewOrderNotifications();
      if (result.discovered || result.notified || result.failed) {
        console.log(
          `[REVENUE] New order notifications: ${result.discovered} discovered, ${result.notified} notified, ${result.failed} pending/failed`
        );
      }
    } catch (err) {
      console.error(
        `[REVENUE] New order notification run failed: ${getErrorMessage(err)}`
      );
    }
  }

  return { ...saved, fetched: rawOrders.length };
}
