'use server';
import OpenAI from 'openai';

async function chatgpt(message: string, apiKey: string) {
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: message }],
    model: 'gpt-4o-mini',
  });

  const content = completion.choices[0].message.content?.replaceAll('**', '');
  return content;
}

export default chatgpt;
