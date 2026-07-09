import cron from "node-cron";
import { runAllWebBlogs } from "./runAutoBlog";

export function startBlogCron() {
    console.log("[CRON] Started");

    cron.schedule(
        "0 2,18 * * *",
        async () => {
            console.log("[CRON] Auto Blog started");
            try {
                await runAllWebBlogs();
                console.log("[CRON] Auto Blog completed");
            } catch (err) {
                console.error("[CRON] Auto Blog failed", err);
            }
        },
        {
            timezone: "Asia/Ho_Chi_Minh",
            noOverlap: true,
        }
    );
}