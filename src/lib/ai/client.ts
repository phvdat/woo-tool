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

  console.log(`
================================
Model       : ${res.model}
Time        : ${Date.now() - start} ms
Input       : ${usage?.input_tokens ?? 0}
Output      : ${usage?.output_tokens ?? 0}
Total       : ${usage?.total_tokens ?? 0}
================================
`);

  return res.output_text.replaceAll("**", "");
}