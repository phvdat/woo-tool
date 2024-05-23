import axios from 'axios';

const endpoint = 'https://api.pawan.krd/v1/chat/completions';

export const sendMessage = async (messages: string, apiKey: string) => {
  const payload = {
    messages: [{ role: 'user', content: messages }],
    model: 'pai-001-light',
    stream: false,
  };
  const { data } = await axios.post(endpoint, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return data;
};
