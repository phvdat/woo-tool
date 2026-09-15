import { formatImages } from '@/helper/format-image';
import { WooWebsitePayload } from '@/types/woo';
import _toString from 'lodash/toString';
import { NextResponse } from 'next/server';

const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});

export async function POST(request: Request) {
  const payload = await request.formData();
  const websiteObject = JSON.parse(
    _toString(payload.get('websiteObject'))
  ) as WooWebsitePayload;
  const telegramId = payload.get('telegramId') as string;
  const name = String(payload.get('name'));
  const images = String(payload.get('images'));
  const imageUrls: string[] = images.split('\n').map(url => url.trim()).filter(Boolean);
  try {
    const result = await formatImages({
      websiteObject,
      name,
      images: imageUrls,
    });

    if (telegramId) {
      await bot.sendMessage(
        telegramId,
        `Download Now:\n${result.downloadLink}`
      );
    }

    return NextResponse.json({
      success: true,
      link: result.downloadLink,
      images: result.images,
    });
  } catch (error: any) {
    console.error(`[FORMAT IMAGE] ${error?.message || 'Unknown error'}`);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
