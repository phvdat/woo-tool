import { SIZE_CHART_LINKS_CONFIG_COLLECTION } from "@/constant/collections"
import { connectToDatabase } from "@/lib/mongodb"


export async function GET() {
  const { db } = await connectToDatabase()
  const data = await db
    .collection('global_config')
    .findOne({ _id: SIZE_CHART_LINKS_CONFIG_COLLECTION } as any)

  return Response.json(data?.data || [])
}

export async function POST(request: Request) {
  const payload = await request.json()
  const { db } = await connectToDatabase()
  await db.collection('global_config').updateOne(
    { _id: SIZE_CHART_LINKS_CONFIG_COLLECTION } as any,
    { $set: { data: payload, updatedAt: new Date() } },
    { upsert: true }
  )

  return Response.json({ success: true })
}