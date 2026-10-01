import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { USERS_COLLECTION } from "@/constant/collections";
import { researchProduct } from "@/services/research";
import { ResearchTopic } from "@/types/research";

export interface ResearchPreviewPayload {
  topicKey: string;
  provisionalTopicKey: string;
  status: ResearchTopic["status"];
  reason?: string;
  trendType: string;
  entities: { name: string; type: string }[];
  queries: { query: string; type: string }[];
  storyBrief: ResearchTopic["storyBrief"];
  claims: {
    claim: string;
    claimType: string;
    importance: string;
    status: string;
    confidence: number;
    independentDomains: string[];
  }[];
  sources: {
    title: string;
    sourceName: string;
    sourceType: string;
    tier: number;
    url: string;
  }[];
  quality: ResearchTopic["quality"];
  researchedAt?: string;
  expiresAt?: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    productName?: string;
    category?: string;
    productUrl?: string;
    website?: string;
    forceRefresh?: boolean;
  };

  const productName = (body.productName || "").trim();
  if (!productName) {
    return NextResponse.json({ error: "productName is required" }, { status: 400 });
  }

  // Research runs on Gemini's grounded call, so it needs a Gemini key rather than
  // the store's OpenAI key.
  const { db } = await connectToDatabase();
  const user = await db
    .collection(USERS_COLLECTION)
    .findOne({ email: session.user.email });

  try {
    const topic = await researchProduct(
      {
        productName,
        category: body.category,
        productUrl: body.productUrl,
        website: body.website,
      },
      { geminiApiKey: user?.geminiApiKey, forceRefresh: body.forceRefresh === true },
    );

    return NextResponse.json(topic);
  } catch (error: any) {
    console.error(`[RESEARCH] preview failed: ${error?.message || "Unknown error"}`);
    return NextResponse.json(
      { error: error?.message || "Research failed" },
      { status: 500 },
    );
  }
}
