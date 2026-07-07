import { filterTrends } from "@/lib/blog/filterTrends";
import { getGoogleTrends } from "@/lib/blog/getTrends";
import { runAutoBlog } from "@/lib/blog/runAutoBlog";
import { connectToDatabase } from "@/lib/mongodb";
import { WebsiteConfig } from "@/types/woo";

const WEBSITE_COLLECTION = "websites";

export async function POST() {
    const { db } = await connectToDatabase();

    const websites: WebsiteConfig[] = await db
        .collection(WEBSITE_COLLECTION)
        .find({
            "autoBlog.enabled": true,
        })
        .toArray();

    if (!websites.length) {
        return Response.json(
            {
                success: true,
                message: "No website enabled auto blog",
            },
            { status: 200 }
        );
    }

    const trends = filterTrends(await getGoogleTrends());


    const usedKeywords = new Set<string>();

    for (const website of websites) {
        await runAutoBlog(
            website,
            trends,
            usedKeywords
        );
    }
    return Response.json({ success: true, }, { status: 200, }
    );
}