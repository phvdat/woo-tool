import cron, { ScheduledTask } from "node-cron";
import { getErrorMessage } from "@/lib/error-utils";
import { syncRevenue } from "./syncRevenue";

let mainJob: ScheduledTask | null = null;
let isRunning = false;

async function tick() {
  if (isRunning) return;
  isRunning = true;

  try {
    const result = await syncRevenue();
    console.log(
      `[REVENUE] Cron synced ${result.upserted} new / ${result.modified} updated order(s) from ${result.fetched} fetched`
    );
  } catch (err) {
    console.error(`[REVENUE] Cron error: ${getErrorMessage(err)}`);
  } finally {
    isRunning = false;
  }
}

export function startRevenueCron(): void {
  if (mainJob) return;

  console.log("[REVENUE] Starting cron (every 30 minutes)");
  mainJob = cron.schedule("*/30 * * * *", tick, {
    timezone: "Asia/Ho_Chi_Minh",
    noOverlap: true,
  });

  console.log("[REVENUE] Cron started");
}
