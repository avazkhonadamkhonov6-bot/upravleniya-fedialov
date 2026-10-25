import { Injectable } from '@nestjs/common';
import { POSITION_LABELS, ROLE_LABELS, type Period } from '@filialhub/shared';
import type { Branch, User } from '../generated/prisma/client';
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
  constructor(private readonly reports: ReportService) {}

  async command(user: User & { branch?: Branch | null }, text: string): Promise<string | null> {
    const command = parseCommand(text);
    if (!command) return null;

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
      const branchId = user.role === 'CHEF' ? undefined : (user.branchId ?? undefined);
      return this.reports.buildReport(periods[command] ?? 'day', branchId);
    }

    return BOT_HELP;
  }
}
