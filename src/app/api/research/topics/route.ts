import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findFreshTopic, listTopics } from "@/services/research";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topicKey = request.nextUrl.searchParams.get("topicKey");

  if (topicKey) {
    const topic = await findFreshTopic([topicKey]);
    if (!topic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(topic);
  }

  const topics = await listTopics(
    Math.min(100, Number(request.nextUrl.searchParams.get("limit")) || 50),
  );

  return NextResponse.json(topics);
}
