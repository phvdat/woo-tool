import { SPY_TELEGRAM_CONFIG_COLLECTION } from "@/constant/collections";
import { connectToDatabase } from "@/lib/mongodb";
import { sendTelegram } from "@/services/telegram/sendTelegram";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  let tempDirectory: string | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Excel file is required" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files are allowed" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Excel file must be 50 MB or smaller" },
        { status: 400 }
      );
    }

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

    const fileStem = path
      .basename(file.name)
      .replace(/\.xlsx$/i, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    const fileName = `${fileStem || "product-spy"}.xlsx`;

    tempDirectory = await mkdtemp(path.join(tmpdir(), "product-spy-"));
    const filePath = path.join(tempDirectory, fileName);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    await sendTelegram({
      telegramId: String(config.chatId),
      fileName,
      filePath,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[PRODUCT-SPY] Excel Telegram export failed: ${message}`);
    return NextResponse.json(
      { error: "Failed to send Excel file to Telegram" },
      { status: 500 }
    );
  } finally {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
}
