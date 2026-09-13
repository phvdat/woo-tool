import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_PRODUCTS_COLLECTION, SPY_COMPETITORS_COLLECTION } from "@/constant/collections";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const competitorId = searchParams.get("competitorId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const { db } = await connectToDatabase();

    const match: Record<string, any> = {};

    if (competitorId) {
      match.competitorId = competitorId;
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

    const competitors = await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .find({})
      .toArray();

    const competitorMap: Record<string, string> = {};
    for (const c of competitors) {
      competitorMap[c._id.toString()] = c.name;
    }

    const enriched = products.map((p) => ({
      ...p,
      _id: p._id?.toString(),
      competitorName: competitorMap[p.competitorId] || "Unknown",
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
