import { runAllWebBlogs } from "@/lib/blog/runAutoBlog";

export async function POST() {
    await runAllWebBlogs();
    return Response.json({ success: true, }, { status: 200, }
    );
}