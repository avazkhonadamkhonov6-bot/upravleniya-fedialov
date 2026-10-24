import { Injectable, OnModuleInit } from '@nestjs/common';
import { phoneDigits, POSITION_LABELS, ROLE_LABELS, type Period } from '@filialhub/shared';
import { PrismaService } from '../prisma/prisma.service';
import { escape } from './notifications.service';
import { ReportService } from './report.service';
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
  ) {}

  onModuleInit() {
    this.telegram.onUpdate((msg) => this.handle(msg));
  }

  private async handle(msg: TgMessage) {
    const chatId = String(msg.chat.id);

    if (msg.contact) return this.linkByContact(chatId, msg);

    const command = (msg.text ?? '').trim().split(/[\s@]/)[0].toLowerCase();
    if (command === '/start') {
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

    return this.telegram.send(chatId, HELP);
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
