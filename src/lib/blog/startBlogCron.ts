import cron, { ScheduledTask } from "node-cron";
import { runAutoBlog } from "./runAutoBlog";
import { connectToDatabase } from "@/lib/mongodb";
import { WEBSITES_COLLECTION } from "@/constant/collections";
import { WebsiteConfig } from "@/types/woo";

const jobs = new Map<string, ScheduledTask>();
const runningWebsites = new Set<string>();

export async function startBlogCron() {
    console.log("[CRON] Starting...");
    const { db } = await connectToDatabase();
    const websites: WebsiteConfig[] = await db
        .collection(WEBSITES_COLLECTION)
        .find({
            "autoBlog.enabled": true,
            "autoBlog.cron": {
                $exists: true,
                $ne: "",
            },
        })
        .toArray();
    for (const website of websites) {
        const websiteKey = website.shopName;
        if (!website.autoBlog.cron) {
            continue;
        }
        if (jobs.has(websiteKey)) {
            continue;
        }
        console.log(
            `[CRON] Schedule ${website.shopName}: ${website.autoBlog.cron}`
        );
        const job = cron.schedule(
            website.autoBlog.cron,
            async () => {
                if (runningWebsites.has(websiteKey)) {
                    console.log(
                        `[CRON] ${website.shopName} is already running`
                    );
                    return;
                }
                runningWebsites.add(websiteKey);
                console.log(
                    `[CRON] ${website.shopName} started`
                );
                try {
                    await runAutoBlog(
                        website,
                        runningWebsites
                    );
                    console.log(
                        `[CRON] ${website.shopName} completed`
                    );
                } catch (error) {
                    console.error(
                        `[CRON] ${website.shopName} failed`,
                        error
                    );
                } finally {
                    runningWebsites.delete(websiteKey);
                }
            },
            {
                timezone: "Asia/Ho_Chi_Minh",
                noOverlap: true,
            }
        );

        jobs.set(websiteKey, job);
    }
    console.log(`[CRON] Started ${jobs.size} website jobs`);
}