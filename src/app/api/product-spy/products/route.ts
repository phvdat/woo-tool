import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  SPY_PRODUCTS_COLLECTION,
  SPY_COMPETITORS_COLLECTION,
} from "@/constant/collections";

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

    for (const competitor of competitors) {
      competitorMap[competitor._id.toString()] = competitor.name;
    }

    const match: Record<string, any> = {};

    // Platform
    if (platform) {
      match.source = platform;
    }

    // Date
    if (from || to) {
      match.firstSeenAt = {};

      if (from) {
        match.firstSeenAt.$gte = from;
      }

      if (to) {
        match.firstSeenAt.$lte = `${to}T23:59:59.999Z`;
      }
    }

    const collection = db.collection(SPY_PRODUCTS_COLLECTION);

    const total = await collection.countDocuments(match);

    const products = await collection
      .find(match)
      .sort({ firstSeenAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const enriched = products.map((product) => {
      const competitorId = product.competitorId?.toString();

      return {
        ...product,
        _id: product._id?.toString(),
        competitorName: competitorId
          ? competitorMap[competitorId] || "Unknown"
          : "Unknown",
        platform: product.source || "unknown",
      };
    });

    return NextResponse.json({
      products: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}