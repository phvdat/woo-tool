import cron, { ScheduledTask } from "node-cron";
import { runAutoBlog } from "./runAutoBlog";
import { connectToDatabase } from "@/lib/mongodb";
import { WEBSITES_COLLECTION } from "@/constant/collections";
import { WebsiteConfig } from "@/types/woo";

const jobs = new Map<
    string,
    {
        cron: string;
        job: ScheduledTask;
    }
>();


function createWebsiteJob(website: WebsiteConfig) {
    const websiteKey = website.shopName;
    const cronExpression = website.autoBlog.cron;

    if (!cronExpression) {
        return;
    }
    console.log(
        `[CRON] Schedule ${website.shopName}: ${cronExpression}`
    );
    const job = cron.schedule(
        cronExpression,
        async () => {
            console.log(
                `[CRON] ${website.shopName} started`
            );
            try {
                await runAutoBlog(
                    website
                );
                console.log(
                    `[CRON] ${website.shopName} completed`
                );
            } catch (error) {
                console.error(
                    `[CRON] ${website.shopName} failed`,
                    error
                );
            }
        },
        {
            timezone: "Asia/Ho_Chi_Minh",
            noOverlap: true,
        }
    );
    jobs.set(websiteKey, {
        cron: cronExpression,
        job,
    });
}

export async function syncBlogCrons() {
    const { db } = await connectToDatabase();
    const websites: WebsiteConfig[] = await db
        .collection(WEBSITES_COLLECTION)
        .find({})
        .toArray();
    const activeWebsiteKeys = new Set<string>();
    for (const website of websites) {
        const websiteKey = website.shopName;
        if (
            !website?.autoBlog?.enabled ||
            !website?.autoBlog?.cron
        ) {
            continue;
        }
        activeWebsiteKeys.add(websiteKey);
        const existing = jobs.get(websiteKey);

        if (!existing) {
            createWebsiteJob(website);
            continue;
        }

        if (existing.cron === website.autoBlog.cron) {
            continue;
        }
        console.log(
            `[CRON] Updating ${website.shopName}: ` +
            `${existing.cron} -> ${website.autoBlog.cron}`
        );
        existing.job.stop();
        jobs.delete(websiteKey);
        // Tạo job mới
        createWebsiteJob(website);
    }

    jobs.forEach((existing, websiteKey) => {
        if (activeWebsiteKeys.has(websiteKey)) {
            return;
        }
        existing.job.stop();
        jobs.delete(websiteKey);
    });
    console.log(
        `[CRON] Active jobs: ${jobs.size}`
    );
}

export async function startBlogCron() {
    console.log("[CRON] Starting...");
    await syncBlogCrons();
    console.log(
        `[CRON] Started ${jobs.size} website jobs`
    );
}