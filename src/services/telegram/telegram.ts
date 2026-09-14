import TelegramBot from "node-telegram-bot-api";
import { Readable } from "stream";

let bot: TelegramBot | null = null;

function getBot(): TelegramBot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not set");
    }
    bot = new TelegramBot(token, { polling: false });
  }
  return bot;
}

export const telegramBot = {
  sendMessage: async (chatId: string, text: string) => {
    return getBot().sendMessage(chatId, text, { parse_mode: "HTML" });
  },

  sendPhoto: async (
    chatId: string,
    photo: string,
    { caption }: { caption: string }
  ) => {
    return getBot().sendPhoto(chatId, photo, {
      caption,
      parse_mode: "HTML",
    });
  },

  sendDocument: async (
    chatId: string,
    stream: Readable,
    { caption }: { caption: string }
  ) => {
    return getBot().sendDocument(chatId, stream, { caption });
  },
};
