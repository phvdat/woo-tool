import { authOptions } from "@/lib/auth";
import { runProductPipeline } from "@/services/product-pipeline";
import {
    emitPipelineError,
    emitPipelineFinished,
} from "@/services/product-pipeline/socket";
import { getServerSession } from "next-auth";

function parseProcessFlag(value: FormDataEntryValue | null, fallback = true) {
    if (value === null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(normalized)) return true;
    if (["false", "0", "off", "no"].includes(normalized)) return false;
    return fallback;
}

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
            processes: {
                buildProducts: parseProcessFlag(formData.get("buildProducts")),
                enrichProducts: parseProcessFlag(formData.get("enrichProducts")),
                uploadProducts: parseProcessFlag(formData.get("uploadProducts")),
            },
        });

        emitPipelineFinished(socketId);

        return Response.json(products);
    } catch (error: any) {
        const message =
            error?.response?.data?.message ||
            error?.message ||
            'Unknown error';
        console.error(`[PIPELINE] ${message}`);
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