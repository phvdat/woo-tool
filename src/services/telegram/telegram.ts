import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

export const telegramBot = {
  sendMessage: async (chatId: string, text: string) => {
    const url = `${process.env.TELEGRAM_BOT_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId.toString(),
      text,
      parse_mode: 'HTML',
    });
    return response.data;
  },

  sendPhoto: async (chatId: string, photo: string, { caption }: { caption: string }) => {
    const url = `${process.env.TELEGRAM_BOT_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const response = await axios.post(url, {
      chat_id: chatId.toString(),
      photo,
      caption,
      parse_mode: 'HTML',
    });
    return response.data;
  },

  sendDocument: async (
    chatId: string,
    stream: NodeJS.ReadableStream,
    { caption }: { caption: string }
  ) => {
    const url = `${process.env.TELEGRAM_BOT_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('document', stream);
    formData.append('caption', caption);
    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
