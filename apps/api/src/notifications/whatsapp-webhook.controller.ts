import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Logger, Param, ParseIntPipe, Post, Query, Req, type RawBodyRequest } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { MEDIA_MAX_BYTES } from '@filialhub/shared';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot.service';
import { ChatService } from './chat.service';
import { GreenApi, htmlToWhatsApp, WhatsAppService } from './whatsapp.service';

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

/** Green-API: огоҳинома (матн, файл, ҳолати пайвастшавӣ) */
interface GreenWebhook {
  typeWebhook?: string;
  stateInstance?: string;
  senderData?: { chatId?: string; senderName?: string };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
    fileMessageData?: { downloadUrl?: string; mimeType?: string; caption?: string };
  };
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

  /**
   * Green-API: паёмҳои воридшаванда (матн, овоз, видео). Сарлавҳаи Authorization: Bearer <сирр> санҷида мешавад.
   * Green-API бояд 200 гирад — вагарна ҳар дақиқа аз нав мефиристад.
   */
  @Post('greenapi')
  @HttpCode(200)
  greenapi(@Body() body: GreenWebhook, @Headers('authorization') auth?: string) {
    return this.green(body, auth, this.whatsapp.green, null);
  }

  /** Рақами WhatsApp-и худи бизнес: ҷавобҳо танҳо ба кормандони ҳамин бизнес мераванд */
  @Post('greenapi/:orgId')
  @HttpCode(200)
  async greenapiOrg(@Param('orgId', ParseIntPipe) orgId: number, @Body() body: GreenWebhook, @Headers('authorization') auth?: string) {
    const client = await this.whatsapp.greenFor(orgId);
    // greenFor ба рақами умумӣ бармегардад, агар бизнес рақам надошта бошад — инро қабул намекунем
    if (!client || client === this.whatsapp.green) throw new ForbiddenException();
    return this.green(body, auth, client, orgId);
  }

  private async green(body: GreenWebhook, auth: string | undefined, client: GreenApi, orgId: number | null) {
    const secret = client.webhookSecret;
    const given = Buffer.from(auth ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new ForbiddenException();
    if (body.typeWebhook === 'stateInstanceChanged') {
      if (!orgId) this.whatsapp.greenState = body.stateInstance ?? null;
      this.logger.log(`Green-API${orgId ? ` (бизнес #${orgId})` : ''} ҳолат: ${body.stateInstance}`);
      return { ok: true };
    }
    if (body.typeWebhook !== 'incomingMessageReceived') return { ok: true };
    const chatId = body.senderData?.chatId ?? '';
    // Танҳо чатҳои шахсӣ (на гурӯҳҳо)
    if (!chatId.endsWith('@c.us')) return { ok: true };
    const from = chatId.replace('@c.us', '');
    const d = body.messageData ?? {};
    const text =
      d.textMessageData?.textMessage ?? d.extendedTextMessageData?.text ?? (d.typeMessage === 'quotedMessage' ? d.extendedTextMessageData?.text : undefined) ?? '';
    const file = d.fileMessageData;
    const kind = d.typeMessage === 'audioMessage' ? ('VOICE' as const) : d.typeMessage === 'videoMessage' ? ('VIDEO_NOTE' as const) : null;
    const media =
      kind && file?.downloadUrl
        ? {
            kind,
            load: async () => {
              const res = await fetch(file.downloadUrl!, { signal: AbortSignal.timeout(60000) });
              if (!res.ok) throw new Error(`Green-API файл ${res.status}`);
              return { data: new Uint8Array(await res.arrayBuffer()), mime: (file.mimeType ?? res.headers.get('content-type') ?? 'audio/ogg').split(';')[0] };
            },
          }
        : null;
    await this.process(from, text, media, orgId).catch((e: Error) => this.logger.error(`${from}: ${e.message}`));
    return { ok: true };
  }

  private async handle(m: WaMessage) {
    const file = m.audio ? { f: m.audio, kind: 'VOICE' as const } : m.video ? { f: m.video, kind: 'VIDEO_NOTE' as const } : null;
    const media = file ? { kind: file.kind, load: () => this.whatsapp.download(file.f.id) } : null;
    const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '';
    return this.process(m.from, text, media);
  }

  /** Як роҳ барои Meta ва Green-API: команда, матн ё файл аз корманд → ба чати FilialHub */
  private async process(
    from: string,
    rawText: string,
    media: { kind: 'VOICE' | 'VIDEO_NOTE'; load: () => Promise<{ data: Uint8Array<ArrayBuffer>; mime: string }> } | null,
    orgId: number | null = null,
  ) {
    // Рақами бизнес — танҳо кормандони ҳамон бизнес; ҷавоб аз ҳамон рақам меравад
    const found = await this.chat.findByPhone(from, orgId ?? undefined);
    const reply = (html: string) => this.whatsapp.send(from, htmlToWhatsApp(html), orgId);
    if (!found) return reply('❌ Ин рақам дар системаи FilialHub ёфт нашуд. Ба менеҷер муроҷиат кунед.');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: found.id }, include: { branch: true } });

    if (media) {
      if (!this.whatsapp.configured) return;
      try {
        const file = await media.load();
        if (file.data.byteLength > MEDIA_MAX_BYTES) return reply('Файл хеле калон аст (то 15 МБ).');
        // WhatsApp давомнокиро намедиҳад — тахминан аз ҳаҷм (овози opus ~2 КБ/сония, видео ~60 КБ/сония).
        const duration = Math.max(1, Math.round(file.data.byteLength / (media.kind === 'VOICE' ? 2000 : 60000)));
        const to = await this.chat.routeIncomingMedia(user, file, media.kind, duration, 'WHATSAPP');
        return reply(to ? `✅ Фиристода шуд ба <b>${to.fullName}</b>.` : 'Қабулкунанда ёфт нашуд.');
      } catch (e) {
        this.logger.warn(`Файл аз ${from}: ${(e as Error).message}`);
        return reply('❌ Файлро гирифта натавонистем, дубора кӯшиш кунед.');
      }
    }

    const text = rawText.trim();
    if (!text) return reply('Ин навъи паём ҳоло қабул намешавад — матн, овоз ё видео фиристед. «кӯмак» нависед.');

    const answer = await this.bot.command(user, text);
    if (answer) return reply(answer);

    const to = await this.chat.routeIncoming(user, text.slice(0, 2000), 'WHATSAPP');
    return reply(to ? `✅ Паём ба <b>${to.fullName}</b> фиристода шуд.` : 'Қабулкунанда ёфт нашуд.');
  }
}
