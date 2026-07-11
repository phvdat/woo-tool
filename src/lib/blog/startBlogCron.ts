import cron from "node-cron";
import { runAllWebBlogs } from "./runAutoBlog";

export function startBlogCron() {
    console.log("[CRON] Started");

    cron.schedule(
        "0 19,21,23,1,3,5 * * *",
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