import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_COMPETITORS_COLLECTION } from "@/constant/collections";
import { ObjectId } from "mongodb";
import { checkCompetitor, checkAllEnabledCompetitors } from "@/services/product-spy/checker";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { competitorId } = body;

    const { db } = await connectToDatabase();

    if (competitorId) {
      const competitor = await db
        .collection(SPY_COMPETITORS_COLLECTION)
        .findOne({ _id: new ObjectId(competitorId) });

      if (!competitor) {
        return NextResponse.json(
          { error: "Competitor not found" },
          { status: 404 }
        );
      }

      checkCompetitor(competitor as any).catch((err) =>
        console.error("[PRODUCT-SPY] Check failed:", err)
      );

      return NextResponse.json({ success: true, message: "Check started" });
    }

    checkAllEnabledCompetitors().catch((err) =>
      console.error("[PRODUCT-SPY] Check all failed:", err)
    );

    return NextResponse.json({
      success: true,
      message: "Checking all enabled competitors",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to start check" },
      { status: 500 }
    );
  }
}
