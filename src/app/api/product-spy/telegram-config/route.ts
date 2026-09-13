import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_TELEGRAM_CONFIG_COLLECTION } from "@/constant/collections";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const config = await db
      .collection(SPY_TELEGRAM_CONFIG_COLLECTION)
      .findOne({});
    return NextResponse.json(config || { chatId: "" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Telegram config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const existing = await db
      .collection(SPY_TELEGRAM_CONFIG_COLLECTION)
      .findOne({});

    if (existing) {
      await db
        .collection(SPY_TELEGRAM_CONFIG_COLLECTION)
        .updateOne({ _id: existing._id }, { $set: { chatId } });
    } else {
      await db
        .collection(SPY_TELEGRAM_CONFIG_COLLECTION)
        .insertOne({ chatId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save Telegram config" },
      { status: 500 }
    );
  }
}
