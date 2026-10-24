import { Injectable, OnModuleInit } from '@nestjs/common';
import { MEDIA_MAX_BYTES, phoneDigits, POSITION_LABELS, ROLE_LABELS, type Period } from '@filialhub/shared';
import { PrismaService } from '../prisma/prisma.service';
import { escape } from './notifications.service';
import { ChatService } from './chat.service';
import { ReportService } from './report.service';
import { verifyTelegramLinkCode } from './telegram-link';
import { TelegramService, TgMessage } from './telegram.service';

const HELP = [
  '<b>Командаҳо:</b>',
  '/today — фурӯш ва фоидаи имрӯз',
  '/week — омори ин ҳафта',
  '/month — омори ин моҳ',
  '/branches — рейтинги филиалҳо (танҳо шеф)',
  '/me — маълумоти ман',
].join('\n');

/** Командаҳои бот: пайваст кардани ҳисоб бо рақами телефон ва дидани омор. */
@Injectable()
export class TelegramBotService implements OnModuleInit {
  constructor(
    private readonly telegram: TelegramService,
    private readonly prisma: PrismaService,
    private readonly reports: ReportService,
    private readonly chat: ChatService,
  ) {}

  onModuleInit() {
    this.telegram.onUpdate((msg) => this.handle(msg));
  }

  private async handle(msg: TgMessage) {
    const chatId = String(msg.chat.id);

    if (msg.contact) return this.linkByContact(chatId, msg);

    const command = (msg.text ?? '').trim().split(/[\s@]/)[0].toLowerCase();
    if (command === '/start') {
      // Пайванд аз профили сайт: /start u12_xxxx — ҳисоб фавран пайваст мешавад.
      const code = (msg.text ?? '').trim().split(/s+/)[1];
      const linkedId = code ? verifyTelegramLinkCode(code) : null;
      if (linkedId) return this.linkUser(chatId, linkedId);
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

    if (command === '/me') {
      const role = user.position ? POSITION_LABELS[user.position] : ROLE_LABELS[user.role];
      return this.telegram.send(
        chatId,
        [
          `👤 <b>${escape(user.fullName)}</b>`,
          `Нақш: ${role}`,
          user.branch ? `Филиал: ${escape(user.branch.name)}` : 'Филиал: ҳама',
          `📞 ${user.phone}`,
          `✉️ ${user.email}`,
        ].join('\n'),
      );
    }

    const periods: Record<string, Period> = { '/today': 'day', '/week': 'week', '/month': 'month' };
    if (periods[command] || command === '/branches') {
      if (user.role === 'STAFF') return this.telegram.send(chatId, 'Омор танҳо барои шеф ва менеҷер дастрас аст.');
      if (command === '/branches' && user.role !== 'CHEF') {
        return this.telegram.send(chatId, 'Рейтинги филиалҳо танҳо барои шеф аст.');
      }
      const branchId = user.role === 'CHEF' ? undefined : (user.branchId ?? undefined);
      return this.telegram.send(chatId, await this.reports.buildReport(periods[command] ?? 'day', branchId));
    }

    // Овоз ё видео аз корманд — ба чати FilialHub.
    const media = msg.voice ?? msg.audio
      ? { file: (msg.voice ?? msg.audio)!, kind: 'VOICE' as const, mime: (msg.voice ?? msg.audio)!.mime_type ?? 'audio/ogg' }
      : msg.video_note ?? msg.video
        ? { file: (msg.video_note ?? msg.video)!, kind: 'VIDEO_NOTE' as const, mime: msg.video?.mime_type ?? 'video/mp4' }
        : null;
    if (media) {
      try {
        const { data } = await this.telegram.download(media.file.file_id);
        if (data.byteLength > MEDIA_MAX_BYTES) return this.telegram.send(chatId, 'Файл хеле калон аст (то 15 МБ).');
        const to = await this.chat.routeIncomingMedia(user, { data, mime: media.mime }, media.kind, media.file.duration, 'TELEGRAM');
        return this.telegram.send(chatId, to ? `✅ Фиристода шуд ба <b>${escape(to.fullName)}</b>.` : 'Қабулкунанда ёфт нашуд.');
      } catch {
        return this.telegram.send(chatId, '❌ Файлро гирифта натавонистем, дубора кӯшиш кунед.');
      }
    }

    // Матни оддӣ (на команда) — ҷавоб дар чат: ба FilialHub меравад.
    const text = (msg.text ?? '').trim();
    if (text && !text.startsWith('/')) {
      const to = await this.chat.routeIncoming(user, text.slice(0, 2000), 'TELEGRAM');
      return this.telegram.send(chatId, to ? `✅ Паём ба <b>${escape(to.fullName)}</b> фиристода шуд.` : 'Қабулкунанда ёфт нашуд.');
    }

    return this.telegram.send(chatId, HELP);
  }

  private async linkUser(chatId: string, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return this.telegram.send(chatId, '❌ Ҳисоб ёфт нашуд.');
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      this.prisma.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } }),
    ]);
    return this.telegram.send(
      chatId,
      `✅ ${escape(user.fullName)}, Telegram пайваст шуд!
Акнун паёмҳо, овозҳо ва видеоҳо аз FilialHub ба ин ҷо меоянд. Ҷавоб нависед ё овоз фиристед — он ба сайт меравад.

${HELP}`,
      { reply_markup: { remove_keyboard: true } },
    );
  }

  private async linkByContact(chatId: string, msg: TgMessage) {
    const contact = msg.contact!;
    // Танҳо рақами худи фиристанда қабул мешавад (на контакти шахси дигар).
    if (contact.user_id && contact.user_id !== msg.chat.id) {
      return this.telegram.send(chatId, 'Лутфан рақами худатонро фиристед.');
    }
    const digits = phoneDigits(contact.phone_number).slice(-9);
    const users = await this.prisma.user.findMany({ where: { isActive: true } });
    // Ҳам рақами телефон, ҳам рақами WhatsApp-и корманд қабул мешавад.
    const user = users.find((u) => [u.phone, u.whatsapp].some((p) => p && phoneDigits(p).slice(-9) === digits));
    if (!user) {
      return this.telegram.send(chatId, '❌ Ин рақам дар системаи FilialHub ёфт нашуд. Ба менеҷер муроҷиат кунед.', {
        reply_markup: { remove_keyboard: true },
      });
    }
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      this.prisma.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } }),
    ]);
    return this.telegram.send(chatId, `✅ ${escape(user.fullName)}, ҳисоби шумо пайваст шуд!\n\n${HELP}`, {
      reply_markup: { remove_keyboard: true },
    });
  }
}
