import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function askAI(prompt: string) {
  const res = await openai.responses.create({
    model: "gpt-5-mini",
    input: prompt,
  });

  return res.output_text;
}