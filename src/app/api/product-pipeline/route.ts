import { runProductPipeline } from "@/services/product-pipeline";
import {
    emitPipelineError,
    emitPipelineFinished,
} from "@/services/product-pipeline/socket";

export async function POST(request: Request) {
    const formData = await request.formData();
    const socketId = Number(formData.get("socketId"));

    try {
        const products = await runProductPipeline({
            file: formData.get("file") as File,
            websiteId: String(formData.get("websiteId")),
            userEmail: String(formData.get("userEmail")),
            socketId,
        });

        emitPipelineFinished(socketId);

        return Response.json(products);
    } catch (error) {
        console.log("error", error);
        emitPipelineError(socketId, error);

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