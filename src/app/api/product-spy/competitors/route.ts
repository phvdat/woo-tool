import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SPY_COMPETITORS_COLLECTION } from "@/constant/collections";
import { ObjectId } from "mongodb";
import { validateUrl } from "@/services/product-spy/validator";
import { detectPlatform } from "@/services/product-spy/detector";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const competitors = await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(competitors);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, checkIntervalMinutes = 10 } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const platform = await detectPlatform(url);

    const competitor = {
      name,
      url,
      platform,
      enabled: true,
      checkIntervalMinutes,
      createdAt: new Date().toISOString(),
    };

    const { db } = await connectToDatabase();
    const result = await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .insertOne(competitor);

    return NextResponse.json({
      _id: result.insertedId,
      ...competitor,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create competitor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { _id, ...updates } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    if (updates.url) {
      const validation = validateUrl(updates.url);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      updates.platform = await detectPlatform(updates.url);
    }

    const { db } = await connectToDatabase();
    await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .updateOne({ _id: new ObjectId(_id) }, { $set: updates });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update competitor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("_id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete competitor" },
      { status: 500 }
    );
  }
}
