import { createReadStream, unlinkSync } from "fs";
import { telegramBot } from "@/services/telegram/telegram";

const bot = telegramBot;

interface SendTelegramParams {
  telegramId: string;
  fileName: string;
  filePath: string;
}

export async function sendTelegram({
  telegramId,
  fileName,
  filePath,
}: SendTelegramParams) {
  const stream = createReadStream(filePath);

  try {
    await bot.sendDocument(telegramId, stream, {
      caption: `Here is your file: ${fileName}`,
    });
  } finally {
    unlinkSync(filePath);
  }
}