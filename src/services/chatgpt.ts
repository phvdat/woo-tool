'use server';
import OpenAI from 'openai';

async function chatgpt(prompt: string, apiKey: string) {
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  const res = await openai.responses.create({
    model: "gpt-5-mini",
    input: prompt,
  });

  const content = res.output_text?.replaceAll('**', '');
  return content;
}

export default chatgpt;
