'use server';
import OpenAI from 'openai';

async function deepSeek(message: string, apiKey: string) {
  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey,
  });
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: message }],
    model: 'deepseek-chat',
  });

  const content = completion.choices[0].message.content?.replaceAll('**', '');
  return content;
}

export default deepSeek;
