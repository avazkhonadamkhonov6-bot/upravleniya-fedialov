import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { ChatService } from './chat.service';

interface WaWebhook {
  entry?: { changes?: { value?: { messages?: { from: string; type: string; text?: { body: string } }[] } }[] }[];
}

/**
 * Webhook-и WhatsApp Cloud API: ҷавобҳои кормандон аз WhatsApp ба чати сайт меоянд.
 * Дар Meta → WhatsApp → Configuration: Callback URL = https://<api>/api/whatsapp/webhook,
 * Verify token = WHATSAPP_VERIFY_TOKEN, field «messages»-ро обуна кунед.
 */
@Controller('whatsapp/webhook')
@Public()
export class WhatsAppWebhookController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  verify(@Query('hub.mode') mode?: string, @Query('hub.verify_token') token?: string, @Query('hub.challenge') challenge?: string) {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
    if (mode === 'subscribe' && expected && token === expected) return challenge;
    throw new ForbiddenException();
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() body: WaWebhook) {
    const messages = body.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];
    for (const m of messages) {
      if (m.type !== 'text' || !m.text?.body) continue;
      const user = await this.chat.findByPhone(m.from);
      if (user) await this.chat.routeIncoming(user, m.text.body.slice(0, 2000), 'WHATSAPP');
    }
    return { ok: true };
  }
}
