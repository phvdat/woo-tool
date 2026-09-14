import { telegramBot } from "@/services/telegram/telegram";
import { SpyCompetitor } from "@/types/product-spy";

const APPAREL_KEYWORDS = [
  "tshirt",
  "t-shirt",
  "t shirt",
  "shirt",
  "hoodie",
  "sweatshirt",
  "sneaker",
  "sneakers",
  "shoe",
  "shoes",
  "jersey",
  "af1",
  "air force",
  "airforce",
  "air max",
  "jacket",
  "jogger",
  "shorts",
  "pants",
  "cap",
  "hat",
];

export function shouldNotifyProduct(title: string): boolean {
  const normalized = title
    .toLowerCase()
    .replace(/[\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return APPAREL_KEYWORDS.some((kw) => normalized.includes(kw));
}

function formatPrice(price?: string): string {
  if (!price) return "N/A";
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return `$${num.toFixed(2)}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unknown";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface NotificationProduct {
  title: string;
  price?: string;
  url: string;
  image?: string;
  firstSeenAt: string;
}

export async function sendNewProductNotification(
  chatId: string,
  competitor: SpyCompetitor,
  product: NotificationProduct
): Promise<boolean> {
  const text = [
    `<b>🚨 NEW PRODUCT</b>`,
    ``,
    `🏪 <b>${escapeHtml(competitor.name)}</b>`,
    `📦 ${escapeHtml(product.title)}`,
    `💰 ${formatPrice(product.price)}`,
    ``,
    `🔗 ${product.url}`,
    `🕐 ${formatDate(product.firstSeenAt)}`,
  ].join("\n");

  const hasImage = !!product.image;

  try {
    if (hasImage) {
      await telegramBot.sendPhoto(chatId, product.image!, {
        caption: text,
      });
    } else {
      await telegramBot.sendMessage(chatId, text);
    }
    return true;
  } catch (err) {
    console.error("[PRODUCT-SPY] Telegram notification failed:", err);
    return false;
  }
}

export async function sendTestMessage(chatId: string): Promise<boolean> {
  const text = `<b>✅ Product Spy Connected</b>\n\nYour Telegram group is configured for competitor monitoring.`;
  try {
    await telegramBot.sendMessage(chatId, text);
    return true;
  } catch (err) {
    console.error("[PRODUCT-SPY] Test Telegram failed:", err);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
