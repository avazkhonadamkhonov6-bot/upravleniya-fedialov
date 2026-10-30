import { SkipThrottle } from '@nestjs/throttler';
import { Body, Controller, ForbiddenException, Headers, HttpCode, Post } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/decorators';
import { TelegramService, TgMessage } from './telegram.service';

/**
 * Webhook-и Telegram: дар сервер (Render) Telegram ҳар паёмро ба ин ҷо мефиристад.
 * Сарлавҳаи X-Telegram-Bot-Api-Secret-Token санҷида мешавад — дархости бегона рад мешавад.
 */
@Controller('telegram/webhook')
@SkipThrottle()
@Public()
export class TelegramWebhookController {
  constructor(private readonly telegram: TelegramService) {}

  @Post()
  @HttpCode(200)
  async receive(@Body() update: { message?: TgMessage }, @Headers('x-telegram-bot-api-secret-token') secret?: string) {
    const expected = this.telegram.webhookSecret;
    const given = Buffer.from(secret ?? '');
    if (!expected || given.length !== expected.length || !timingSafeEqual(given, Buffer.from(expected))) {
      throw new ForbiddenException();
    }
    await this.telegram.handleUpdate(update);
    return { ok: true };
  }
}
