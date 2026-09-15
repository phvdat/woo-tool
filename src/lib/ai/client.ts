import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function askAI(
  prompt: string,
): Promise<string> {
  const start = Date.now();

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const usage = res.usage;

  console.log(`[AI] ${res.model} | ${Date.now() - start}ms | tokens: ${usage?.total_tokens ?? 0}`);

  return res.output_text.replaceAll("**", "");
}