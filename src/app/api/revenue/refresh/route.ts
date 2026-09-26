import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncRevenue } from "@/services/revenue";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({}, { status: 401 });
    }

    const result = await syncRevenue({ userEmail: session.user.email });

    return Response.json(result);
  } catch (error: any) {
    console.error(`[REVENUE] Refresh failed: ${error?.message || 'Sync failed'}`);
    return Response.json(
      { message: error?.message || "Refresh failed" },
      { status: 500 }
    );
  }
}
