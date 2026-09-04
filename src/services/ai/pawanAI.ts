import axios from 'axios';
import _get from 'lodash/get';
const endpoint = 'https://api.pawan.krd/v1/chat/completions';
const apiKey = process.env.PAWAN_API_KEY

export const pawanAI = async (messages: string) => {
  const payload = {
    messages: [{ role: 'user', content: messages }],
    model: 'stepfun-ai/Step-3.5-Flash',
    stream: false,
  };
  const { data } = await axios.post(endpoint, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const content = _get(data, 'choices[0].message.content', '').replaceAll(
    '*',
    ''
  );
  return content;
};
