import Groq from 'groq-sdk';
import _get from 'lodash/get';
const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

export const groqResponse = async (messages: string, apiKey: string) => {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: messages,
      },
    ],
    model: 'llama-3.3-70b-versatile',
  });
  console.log('devvvvv', completion.choices[0].message.content);
  const content = completion.choices[0].message.content;
  return content;
};
