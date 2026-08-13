import { authOptions } from "@/lib/auth";
import { runProductPipeline } from "@/services/product-pipeline";
import {
    emitPipelineError,
    emitPipelineFinished,
} from "@/services/product-pipeline/socket";
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
    const formData = await request.formData();
    const socketId = String(formData.get("websiteId"));
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return Response.json({}, { status: 401 });
    }
    const userEmail = session.user.email;
    try {
        const products = await runProductPipeline({
            file: formData.get("file") as File,
            websiteId: String(formData.get("websiteId")),
            userEmail: String(userEmail),
            socketId,
        });

        emitPipelineFinished(socketId);

        return Response.json(products);
    } catch (error: any) {
        console.log("error", error);
        const message =
            error?.response?.data?.message ||
            error?.message ||
            'Unknown error';
        emitPipelineError(socketId, message);
        return Response.json(
            {
                message: error instanceof Error ? error.message : "Internal Server Error",
            },
            {
                status: 500,
            },
        );
    }
}