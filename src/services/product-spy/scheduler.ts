import cron, { ScheduledTask } from "node-cron";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_COMPETITORS_COLLECTION } from "@/constant/collections";
import { SpyCompetitor } from "@/types/product-spy";
import { checkCompetitor } from "./checker";

let mainJob: ScheduledTask | null = null;
let isRunning = false;

async function tick() {
  if (isRunning) return;
  isRunning = true;

  try {
    const { db } = await connectToDatabase();
    const competitors = await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .find({ enabled: true })
      .toArray();

    const now = Date.now();
    const due: SpyCompetitor[] = [];

    for (const comp of competitors) {
      const interval = comp.checkIntervalMinutes;
      if (!interval || interval <= 0) continue;

      if (!comp.lastCheckAt) {
        due.push(comp as unknown as SpyCompetitor);
        continue;
      }

      const lastCheck = new Date(comp.lastCheckAt).getTime();
      const intervalMs = comp.checkIntervalMinutes * 60 * 1000;
      if (now - lastCheck >= intervalMs) {
        due.push(comp as unknown as SpyCompetitor);
      }
    }

    if (due.length === 0) return;

    const MAX_CONCURRENT = 3;
    let running = 0;
    const queue: Array<() => void> = [];

    const done = new Promise<void>((resolve) => {
      let completed = 0;
      const total = due.length;

      function runNext() {
        if (queue.length === 0 || running >= MAX_CONCURRENT) return;
        running++;
        const next = queue.shift()!;
        next();
      }

      for (const comp of due) {
        const task = async () => {
          try {
            await checkCompetitor(comp);
          } finally {
            completed++;
            running--;
            if (completed >= total) {
              resolve();
            } else {
              runNext();
            }
          }
        };
        queue.push(() => task());
      }

      runNext();
    });

    await done;
  } catch (err) {
    console.error("[PRODUCT-SPY] Tick error:", err);
  } finally {
    isRunning = false;
  }
}

export async function startProductSpyCron(): Promise<void> {
  if (mainJob) return;

  console.log("[PRODUCT-SPY] Starting scheduler (every minute)");
  mainJob = cron.schedule("* * * * *", tick, {
    timezone: "Asia/Ho_Chi_Minh",
    noOverlap: true,
  });

  console.log("[PRODUCT-SPY] Scheduler started");
}

export async function stopProductSpyCron(): Promise<void> {
  if (mainJob) {
    mainJob.stop();
    mainJob = null;
    console.log("[PRODUCT-SPY] Scheduler stopped");
  }
}
