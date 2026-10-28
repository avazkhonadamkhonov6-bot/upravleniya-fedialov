import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { POSITION_LABELS, ROLE_LABELS, type Period } from '@filialhub/shared';
import { AdminService } from '../admin/admin';
import type { Branch, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { escape } from './notifications.service';
import { ReportService } from './report.service';

export const BOT_HELP = [
  '<b>Командаҳо:</b>',
  '/today — фурӯш ва фоидаи имрӯз',
  '/week — омори ин ҳафта',
  '/month — омори ин моҳ',
  '/branches — рейтинги филиалҳо (танҳо шеф)',
  '/me — маълумоти ман',
  '/help — кӯмак',
  '',
  'Матни оддӣ, овоз ё видео нависед — он ба чати FilialHub меравад.',
].join('\n');

/** Танҳо супер-админ мебинад */
const ADMIN_HELP = [
  '',
  '',
  '<b>Супер-админ:</b>',
  '/pending — дархостҳои нав',
  '/approve ID — тасдиқ',
  '/reject ID сабаб — рад',
  '/block ID сабаб — бастан',
  '/business ID — маълумоти бизнес',
].join('\n');

/** Калимаҳо бе «/» ҳам кор мекунанд (дар WhatsApp «/» нотавон аст): «имрӯз», «today», «сегодня»… */
const ALIASES: Record<string, string> = {
  today: '/today', имрӯз: '/today', имруз: '/today', сегодня: '/today',
  week: '/week', ҳафта: '/week', хафта: '/week', неделя: '/week',
  month: '/month', моҳ: '/month', мох: '/month', месяц: '/month',
  branches: '/branches', филиалҳо: '/branches', филиалхо: '/branches', филиалы: '/branches',
  me: '/me', ман: '/me', я: '/me',
  help: '/help', кӯмак: '/help', кумак: '/help', помощь: '/help', start: '/help', menu: '/help', меню: '/help',
};

/** «/today@MyBot» ё «Имрӯз» → «/today»; агар команда набошад — null. */
export function parseCommand(text: string): string | null {
  const word = text.trim().split(/[\s@]/)[0].toLowerCase();
  if (word.startsWith('/')) return word;
  return ALIASES[word] && text.trim().split(/\s+/).length === 1 ? ALIASES[word] : null;
}

/**
 * Командаҳои бот — як ҷо барои Telegram ва WhatsApp.
 * Ҷавоб — матни HTML (WhatsApp онро бе тегҳо мефиристад) ё null, агар матн команда набошад.
 */
@Injectable()
export class BotService {
  constructor(
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async command(user: User & { branch?: Branch | null }, text: string): Promise<string | null> {
    const command = parseCommand(text);
    if (!command) return null;

    // Командаҳои супер-админ: /pending, /approve 12, /reject 12 сабаб…
    // AdminService дар модули дигар аст — бо ModuleRef мегирем, то вобастагии даврӣ набошад.
    const admin = this.moduleRef.get(AdminService, { strict: false });
    const adminReply = await admin.botCommand(user, command, text.trim().split(/\s+/).slice(1));
    if (adminReply) return adminReply;

    // Бизнеси тасдиқнашуда ё басташуда: омор дастрас нест (супер-админ — ҳамеша).
    const org = await this.prisma.organization.findUnique({ where: { id: user.organizationId }, select: { status: true } });
    if (!user.isSuperAdmin && org?.status !== 'APPROVED') {
      return org?.status === 'PENDING' ? '🕓 Бизнеси шумо интизори тасдиқи супер-админ аст. Пас аз тасдиқ ба шумо хабар медиҳем.' : '⛔ Бизнеси шумо баста аст. Ба супер-админ муроҷиат кунед.';
    }

    if (command === '/me') {
      const role = user.position ? POSITION_LABELS[user.position] : ROLE_LABELS[user.role];
      return [
        `👤 <b>${escape(user.fullName)}</b>`,
        `Нақш: ${role}`,
        user.branch ? `Филиал: ${escape(user.branch.name)}` : 'Филиал: ҳама',
        `📞 ${user.phone}`,
        `✉️ ${user.email}`,
      ].join('\n');
    }

    const periods: Record<string, Period> = { '/today': 'day', '/week': 'week', '/month': 'month' };
    if (periods[command] || command === '/branches') {
      if (user.role === 'STAFF') return 'Омор танҳо барои шеф ва менеҷер дастрас аст.';
      if (command === '/branches' && user.role !== 'CHEF') return 'Рейтинги филиалҳо танҳо барои шеф аст.';
      return this.reports.buildReport(periods[command] ?? 'day', user);
    }

    return user.isSuperAdmin ? BOT_HELP + ADMIN_HELP : BOT_HELP;
  }
}
