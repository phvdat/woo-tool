import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_PRODUCTS_COLLECTION, SPY_COMPETITORS_COLLECTION } from "@/constant/collections";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const platform = searchParams.get("platform");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const { db } = await connectToDatabase();

    const competitors = await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .find({})
      .toArray();

    const competitorMap: Record<string, string> = {};
    const competitorPlatformMap: Record<string, string> = {};
    for (const c of competitors) {
      const id = c._id.toString();
      competitorMap[id] = c.name;
      competitorPlatformMap[id] = c.platform;
    }

    const match: Record<string, any> = {};

    if (platform) {
      const matchingIds = competitors
        .filter((c) => c.platform === platform)
        .map((c) => c._id.toString());
      match.competitorId = { $in: matchingIds };
    }

    if (from || to) {
      match.firstSeenAt = {};
      if (from) match.firstSeenAt.$gte = from;
      if (to) match.firstSeenAt.$lte = to + "T23:59:59.999Z";
    }

    const total = await db
      .collection(SPY_PRODUCTS_COLLECTION)
      .countDocuments(match);

    const products = await db
      .collection(SPY_PRODUCTS_COLLECTION)
      .find(match)
      .sort({ firstSeenAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const enriched = products.map((p) => ({
      ...p,
      _id: p._id?.toString(),
      competitorName: competitorMap[p.competitorId] || "Unknown",
      platform: competitorPlatformMap[p.competitorId] || "unknown",
    }));

    return NextResponse.json({
      products: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
