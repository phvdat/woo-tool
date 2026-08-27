import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function gemini(prompt: string) {
    const interaction = await ai.interactions.create({
        model: "gemini-3.7-flash",
        input: prompt,
    });
    console.log(interaction.output_text);
    const content = interaction.output_text?.replaceAll('**', '');
    return content;
}

export default gemini;