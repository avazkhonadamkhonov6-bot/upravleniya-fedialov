import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Logger, Post, Query, Req, type RawBodyRequest } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { MEDIA_MAX_BYTES } from '@filialhub/shared';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot.service';
import { ChatService } from './chat.service';
import { htmlToWhatsApp, WhatsAppService } from './whatsapp.service';

interface WaMedia {
  id: string;
  mime_type?: string;
}

interface WaMessage {
  from: string;
  type: string;
  text?: { body: string };
  audio?: WaMedia & { voice?: boolean };
  video?: WaMedia & { caption?: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}

interface WaWebhook {
  entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[];
}

/**
 * Webhook-и WhatsApp Cloud API — боти WhatsApp: ҷавобҳои кормандон (матн, овоз, видео) ба чати сайт меоянд,
 * командаҳо (имрӯз, ҳафта, моҳ, ман, кӯмак) фавран ҷавоб мегиранд.
 * Дар Meta → WhatsApp → Configuration: Callback URL = https://<api>/api/whatsapp/webhook,
 * Verify token = WHATSAPP_VERIFY_TOKEN, field «messages»-ро обуна кунед.
 * Агар WHATSAPP_APP_SECRET гузошта шавад, имзои X-Hub-Signature-256 санҷида мешавад (дархости бегонаро рад мекунад).
 */
@Controller('whatsapp/webhook')
@Public()
export class WhatsAppWebhookController {
  private readonly logger = new Logger('WhatsAppBot');

  constructor(
    private readonly chat: ChatService,
    private readonly bot: BotService,
    private readonly whatsapp: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  verify(@Query('hub.mode') mode?: string, @Query('hub.verify_token') token?: string, @Query('hub.challenge') challenge?: string) {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
    if (mode === 'subscribe' && expected && token === expected) return challenge;
    throw new ForbiddenException();
  }

  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>, @Body() body: WaWebhook, @Headers('x-hub-signature-256') signature?: string) {
    this.checkSignature(req.rawBody, signature);
    const messages = body.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];
    for (const m of messages) {
      await this.handle(m).catch((e: Error) => this.logger.error(`${m.from}: ${e.message}`));
    }
    return { ok: true };
  }

  private checkSignature(raw: Buffer | undefined, signature?: string) {
    const secret = process.env.WHATSAPP_APP_SECRET?.trim();
    if (!secret) return;
    const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw ?? Buffer.alloc(0)).digest('hex')}`);
    const given = Buffer.from(signature ?? '');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new ForbiddenException('Имзои нодуруст');
  }

  private async handle(m: WaMessage) {
    const found = await this.chat.findByPhone(m.from);
    const reply = (html: string) => this.whatsapp.send(m.from, htmlToWhatsApp(html));
    if (!found) return reply('❌ Ин рақам дар системаи FilialHub ёфт нашуд. Ба менеҷер муроҷиат кунед.');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: found.id }, include: { branch: true } });

    const media = m.audio ? { file: m.audio, kind: 'VOICE' as const } : m.video ? { file: m.video, kind: 'VIDEO_NOTE' as const } : null;
    if (media) {
      if (!this.whatsapp.configured) return;
      try {
        const file = await this.whatsapp.download(media.file.id);
        if (file.data.byteLength > MEDIA_MAX_BYTES) return reply('Файл хеле калон аст (то 15 МБ).');
        // WhatsApp давомнокиро намедиҳад — тахминан аз ҳаҷм (овози opus ~2 КБ/сония, видео ~60 КБ/сония).
        const duration = Math.max(1, Math.round(file.data.byteLength / (media.kind === 'VOICE' ? 2000 : 60000)));
        const to = await this.chat.routeIncomingMedia(user, file, media.kind, duration, 'WHATSAPP');
        return reply(to ? `✅ Фиристода шуд ба <b>${to.fullName}</b>.` : 'Қабулкунанда ёфт нашуд.');
      } catch (e) {
        this.logger.warn(`Файл аз ${m.from}: ${(e as Error).message}`);
        return reply('❌ Файлро гирифта натавонистем, дубора кӯшиш кунед.');
      }
    }

    const text = (m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '').trim();
    if (!text) return reply('Ин навъи паём ҳоло қабул намешавад — матн, овоз ё видео фиристед. «кӯмак» нависед.');

    const answer = await this.bot.command(user, text);
    if (answer) return reply(answer);

    const to = await this.chat.routeIncoming(user, text.slice(0, 2000), 'WHATSAPP');
    return reply(to ? `✅ Паём ба <b>${to.fullName}</b> фиристода шуд.` : 'Қабулкунанда ёфт нашуд.');
  }
}
