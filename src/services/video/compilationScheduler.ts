import cron, { ScheduledTask } from 'node-cron';
import { connectToDatabase } from '@/lib/mongodb';
import { WEBSITES_COLLECTION } from '@/constant/collections';
import { WooWebsitePayload } from '@/types/woo';
import { getErrorMessage } from '@/lib/error-utils';
import { runCompilationForWebsite } from './runCompilation';

let mainJob: ScheduledTask | null = null;
let isRunning = false;

async function tick() {
  if (isRunning) return;
  isRunning = true;

  try {
    const { db } = await connectToDatabase();
    const websites = await db
      .collection(WEBSITES_COLLECTION)
      .find({ 'autoCompilation.enabled': true })
      .toArray();

    for (const website of websites) {
      try {
        await runCompilationForWebsite(website as unknown as WooWebsitePayload);
      } catch (error) {
        console.error(
          `[COMPILATION] ${website.shopName}: ${getErrorMessage(error)}`
        );
      }
    }
  } catch (error) {
    console.error(`[COMPILATION] Tick error: ${getErrorMessage(error)}`);
  } finally {
    isRunning = false;
  }
}

export function startCompilationCron(): void {
  if (mainJob) return;

  console.log('[COMPILATION] Starting scheduler (every minute)');
  mainJob = cron.schedule('* * * * *', tick, {
    timezone: 'Asia/Ho_Chi_Minh',
    noOverlap: true,
  });
}
