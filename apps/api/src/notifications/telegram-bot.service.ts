import { Injectable, OnModuleInit } from '@nestjs/common';
import { MEDIA_MAX_BYTES } from '@filialhub/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BOT_HELP, BotService } from './bot.service';
import { ChatService } from './chat.service';
import { escape } from './notifications.service';
import { verifyTelegramLinkCode } from './telegram-link';
import { TelegramService, TgMessage } from './telegram.service';

/** Боти Telegram: пайваст кардани ҳисоб (пайванд аз профил ё рақами телефон), командаҳо ва ҷавобҳо ба чати сайт. */
@Injectable()
export class TelegramBotService implements OnModuleInit {
  constructor(
    private readonly telegram: TelegramService,
    private readonly prisma: PrismaService,
    private readonly bot: BotService,
    private readonly chat: ChatService,
  ) {}

  onModuleInit() {
    this.telegram.onUpdate((msg) => this.handle(msg));
  }

  private async handle(msg: TgMessage) {
    const chatId = String(msg.chat.id);

    if (msg.contact) return this.linkByContact(chatId, msg);

    const text = (msg.text ?? msg.caption ?? '').trim();
    if (text.split(/[\s@]/)[0].toLowerCase() === '/start') {
      // Пайванд аз профили сайт: /start u12_xxxx — ҳисоб фавран пайваст мешавад.
      const code = text.split(/\s+/)[1];
      const linkedId = code ? verifyTelegramLinkCode(code) : null;
      if (linkedId) return this.linkUser(chatId, linkedId);
      const known = await this.prisma.user.findUnique({ where: { telegramChatId: chatId } });
      if (known?.isActive) return this.telegram.send(chatId, `👋 ${escape(known.fullName)}, ҳисоби шумо аллакай пайваст аст.\n\n${BOT_HELP}`);
      return this.telegram.send(
        chatId,
        '👋 Салом! Ин боти <b>FilialHub</b> аст.\nБарои пайваст кардани ҳисоб тугмаи поёнро пахш кунед ва рақами телефонатонро фиристед.',
        {
          reply_markup: {
            keyboard: [[{ text: '📱 Фиристодани рақам', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    }

    const user = await this.prisma.user.findUnique({ where: { telegramChatId: chatId }, include: { branch: true } });
    if (!user || !user.isActive) {
      return this.telegram.send(chatId, 'Ҳисоби шумо пайваст нест. Аввал /start нависед.');
    }

    // Овоз ё видео аз корманд — ба чати FilialHub.
    const audio = msg.voice ?? msg.audio;
    const video = msg.video_note ?? msg.video;
    const media = audio
      ? { file: audio, kind: 'VOICE' as const, mime: audio.mime_type ?? 'audio/ogg' }
      : video
        ? { file: video, kind: 'VIDEO_NOTE' as const, mime: msg.video?.mime_type ?? 'video/mp4' }
        : null;
    if (media) {
      try {
        const { data } = await this.telegram.download(media.file.file_id);
        if (data.byteLength > MEDIA_MAX_BYTES) return this.telegram.send(chatId, 'Файл хеле калон аст (то 15 МБ).');
        const to = await this.chat.routeIncomingMedia(user, { data, mime: media.mime }, media.kind, media.file.duration || 1, 'TELEGRAM');
        return this.telegram.send(chatId, to ? `✅ Фиристода шуд ба <b>${escape(to.fullName)}</b>.` : 'Қабулкунанда ёфт нашуд.');
      } catch {
        return this.telegram.send(chatId, '❌ Файлро гирифта натавонистем (то 20 МБ), дубора кӯшиш кунед.');
      }
    }

    const reply = await this.bot.command(user, text);
    if (reply) return this.telegram.send(chatId, reply);

    // Матни оддӣ (на команда) — ҷавоб дар чат: ба FilialHub меравад.
    if (text) {
      const to = await this.chat.routeIncoming(user, text.slice(0, 2000), 'TELEGRAM');
      return this.telegram.send(chatId, to ? `✅ Паём ба <b>${escape(to.fullName)}</b> фиристода шуд.` : 'Қабулкунанда ёфт нашуд.');
    }

    // Стикер, сурат ва ғайра — ҳоло қабул намешаванд.
    return this.telegram.send(chatId, `Ин навъи паём ҳоло қабул намешавад — матн, овоз ё видео фиристед.\n\n${BOT_HELP}`);
  }

  private async linkUser(chatId: string, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return this.telegram.send(chatId, '❌ Ҳисоб ёфт нашуд.');
    await this.attach(chatId, user.id);
    return this.telegram.send(
      chatId,
      `✅ ${escape(user.fullName)}, Telegram пайваст шуд!
Акнун паёмҳо, овозҳо ва видеоҳо аз FilialHub ба ин ҷо меоянд. Ҷавоб нависед ё овоз фиристед — он ба сайт меравад.

${BOT_HELP}`,
      { reply_markup: { remove_keyboard: true } },
    );
  }

  private async linkByContact(chatId: string, msg: TgMessage) {
    const contact = msg.contact!;
    // Танҳо рақами худи фиристанда қабул мешавад (на контакти шахси дигар).
    if (contact.user_id !== msg.from?.id) {
      return this.telegram.send(chatId, 'Лутфан рақами худатонро бо тугмаи «📱 Фиристодани рақам» фиристед.');
    }
    // Ҳам рақами телефон, ҳам рақами WhatsApp-и корманд қабул мешавад.
    const user = await this.chat.findByPhone(contact.phone_number);
    if (!user) {
      return this.telegram.send(chatId, '❌ Ин рақам дар системаи FilialHub ёфт нашуд. Ба менеҷер муроҷиат кунед.', {
        reply_markup: { remove_keyboard: true },
      });
    }
    await this.attach(chatId, user.id);
    return this.telegram.send(chatId, `✅ ${escape(user.fullName)}, ҳисоби шумо пайваст шуд!\n\n${BOT_HELP}`, {
      reply_markup: { remove_keyboard: true },
    });
  }

  /** Як чати Telegram — як ҳисоб: аз ҳисоби пешина ҷудо карда, ба ҳисоби нав мепайвандем. */
  private attach(chatId: string, userId: number) {
    return this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      this.prisma.user.update({ where: { id: userId }, data: { telegramChatId: chatId } }),
    ]);
  }
}
