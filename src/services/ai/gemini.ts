import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
];

async function gemini(prompt: string) {
    for (const modelName of MODELS) {
        try {
            const interaction = await ai.interactions.create({
                model: modelName,
                input: prompt,
            });

            const content = interaction.output_text?.replaceAll("**", "");
            return content;
        } catch (error: any) {
            const isRateLimit = error?.status === 429 || error?.message?.includes("429");

            if (isRateLimit) {
                console.warn(`Model ${modelName} bị chạm trần 429. Đang chuyển sang model tiếp theo...`);
                continue;
            }

            throw error;
        }
    }

    throw new Error("Tất cả các model trong danh sách fallback đều đã chạm giới hạn 429!");
}

export default gemini;