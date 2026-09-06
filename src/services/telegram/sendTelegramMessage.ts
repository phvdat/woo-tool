import { telegramBot } from "@/services/telegram/telegram";

interface SendTelegramMessageParams {
  telegramId: string;
  message: string;
}

export async function sendTelegramMessage({
  telegramId,
  message,
}: SendTelegramMessageParams) {
  await telegramBot.sendMessage(telegramId, message);
}
