import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
];

const modelCooldown = new Map<string, number>();

function isModelAvailable(model: string): boolean {
    const cooldownUntil = modelCooldown.get(model);
    if (!cooldownUntil) {
        return true;
    }
    if (Date.now() >= cooldownUntil) {
        modelCooldown.delete(model);
        return true;
    }
    return false;
}

function getRetryAfterSeconds(error: any): number {
    const message = String(error?.message ?? "");
    const match = message.match(/retry in ([\d.]+)s/i);
    if (match) {
        const seconds = Number(match[1]);

        if (Number.isFinite(seconds) && seconds > 0) {
            return Math.ceil(seconds);
        }
    }
    return 40;
}

function cooldownModel(model: string, seconds: number): void {
    modelCooldown.set(
        model,
        Date.now() + seconds * 1000,
    );
}

function isRateLimitError(error: any): boolean {
    return (
        error?.status === 429 ||
        String(error?.message ?? "").includes("429")
    );
}

async function gemini(prompt: string): Promise<string> {
    let attemptedModel = false;
    for (const modelName of MODELS) {
        if (!isModelAvailable(modelName)) {
            continue;
        }
        attemptedModel = true;
        try {
            const interaction = await ai.interactions.create({
                model: modelName,
                input: prompt,
            });
            return interaction.output_text?.replaceAll("**", "") || "";
        } catch (error: any) {
            const status = error?.status;

            const isRateLimit =
                status === 429 ||
                String(error?.message ?? "").includes("429");

            const isTemporaryOverload =
                status === 500 ||
                status === 503 ||
                /currently experiencing high demand|spikes in demand|try again later/i.test(
                    String(error?.message ?? ""),
                );

            if (isRateLimit) {
                const retryAfter = getRetryAfterSeconds(error);

                cooldownModel(modelName, retryAfter);

                console.warn(
                    `Gemini ${modelName} quota exceeded, cooldown ${retryAfter}s.`,
                );

                continue;
            }

            if (isTemporaryOverload) {
                const cooldownSeconds = 20;

                cooldownModel(modelName, cooldownSeconds);

                console.warn(
                    `Gemini ${modelName} overloaded, cooldown ${cooldownSeconds}s.`,
                );

                continue;
            }

            console.error(`Gemini failed: ${modelName} (${error?.status || 'unknown'}): ${error?.message || 'Unknown error'}`);

            throw error;
        }
    }

    if (!attemptedModel) {
        throw new Error(
            "Tất cả Gemini models đang trong thời gian cooldown.",
        );
    }

    throw new Error(
        "Tất cả Gemini models đều không khả dụng.",
    );
}

export default gemini;