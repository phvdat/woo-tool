import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_TELEGRAM_CONFIG_COLLECTION } from "@/constant/collections";
import { sendTestMessage } from "@/services/product-spy/telegram-notifier";

export async function POST() {
  try {
    const { db } = await connectToDatabase();
    const config = await db
      .collection(SPY_TELEGRAM_CONFIG_COLLECTION)
      .findOne({});

    if (!config?.chatId) {
      return NextResponse.json(
        { error: "Telegram Chat ID not configured" },
        { status: 400 }
      );
    }

    const sent = await sendTestMessage(config.chatId);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send test message. Check your Bot Token and Chat ID." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Test message sent" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send test message" },
      { status: 500 }
    );
  }
}
