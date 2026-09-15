import { loadRevenue } from "@/services/revenue";
import _get from "lodash/get";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({}, { status: 401 });
    }
    const body = await request.json();
    const result = await loadRevenue({
      ...body,
      userEmail: session.user.email,
    });

    return Response.json(result);
  } catch (error: any) {
    console.error(`[REVENUE] ${error?.message || 'Load revenue failed'}`);
    return Response.json(
      {
        message: _get(
          error,
          "response.data.message",
          "Load revenue failed"
        ),
      },
      {
        status: _get(error, "response.status", 500),
      }
    );
  }
}