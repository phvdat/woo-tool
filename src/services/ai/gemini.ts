import { GoogleGenAI } from "@google/genai";

const MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
];

const modelCooldown = new Map<string, number>();

export interface GroundedSource {
    url: string;
    title: string;
    domain: string;
}

export interface GroundedResult {
    text: string;
    sources: GroundedSource[];
    queries: string[];
}

export interface GroundedOptions {
    prompt: string;
    apiKey?: string;
}

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

function classifyError(error: any): "rate_limit" | "overload" | "fatal" {
    const status = error?.status;
    const message = String(error?.message ?? "");

    if (status === 429 || message.includes("429")) {
        return "rate_limit";
    }

    if (
        status === 500 ||
        status === 503 ||
        /currently experiencing high demand|spikes in demand|try again later/i.test(message)
    ) {
        return "overload";
    }

    return "fatal";
}

/**
 * Single retry/cooldown policy shared by every Gemini call shape. Each invoke
 * builds its own client so per-user keys keep working.
 */
async function runAcrossModels<T>(invoke: (model: string) => Promise<T>): Promise<T> {
    let attemptedModel = false;
    for (const modelName of MODELS) {
        if (!isModelAvailable(modelName)) {
            continue;
        }
        attemptedModel = true;
        try {
            return await invoke(modelName);
        } catch (error: any) {
            const kind = classifyError(error);

            if (kind === "rate_limit") {
                const retryAfter = getRetryAfterSeconds(error);

                cooldownModel(modelName, retryAfter);

                console.warn(
                    `Gemini ${modelName} quota exceeded, cooldown ${retryAfter}s.`,
                );

                continue;
            }

            if (kind === "overload") {
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

function hostOf(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return "";
    }
}

async function gemini(prompt: string, apiKey?: string): Promise<string> {
    return runAcrossModels(async (modelName) => {
        const ai = new GoogleGenAI({
            apiKey: apiKey || process.env.GEMINI_API_KEY,
        });

        const interaction = await ai.interactions.create({
            model: modelName,
            input: prompt,
        });

        return interaction.output_text?.replaceAll("**", "") || "";
    });
}

/**
 * Google-Search-grounded completion.
 *
 * `interactions.create` never returns `groundingMetadata`, so research uses the
 * `models.generateContent` surface instead: it yields the real result URLs and
 * the queries Google actually executed, which is what makes source tiers and
 * independent-domain counting auditable rather than model-reported.
 */
async function geminiGrounded({ prompt, apiKey }: GroundedOptions): Promise<GroundedResult> {
    return runAcrossModels(async (modelName) => {
        const ai = new GoogleGenAI({
            apiKey: apiKey || process.env.GEMINI_API_KEY,
        });

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const grounding = response.candidates?.[0]?.groundingMetadata;

        const seen = new Set<string>();
        const sources: GroundedSource[] = [];

        for (const chunk of grounding?.groundingChunks || []) {
            const web = chunk.web;
            if (!web?.uri || seen.has(web.uri)) {
                continue;
            }
            seen.add(web.uri);
            sources.push({
                url: web.uri,
                title: web.title || web.uri,
                domain: web.domain || hostOf(web.uri),
            });
        }

        return {
            text: (response.text || "").replaceAll("**", ""),
            sources,
            queries: grounding?.webSearchQueries || [],
        };
    });
}

export default gemini;
export { geminiGrounded };
