import { connectToDatabase } from "@/lib/mongodb"

const SIZE_CHART_LINKS_CONFIG_COLLECTION = 'size_chart_links'

export async function GET() {
  const { db } = await connectToDatabase()
  const data = await db
    .collection('global_config')
    .findOne({ _id: SIZE_CHART_LINKS_CONFIG_COLLECTION })

  return Response.json(data?.data || [])
}

export async function POST(request: Request) {
  const payload = await request.json()
  const { db } = await connectToDatabase()
  await db.collection('global_config').updateOne(
    { _id: SIZE_CHART_LINKS_CONFIG_COLLECTION },
    { $set: { data: payload, updatedAt: new Date() } },
    { upsert: true }
  )

  return Response.json({ success: true })
}