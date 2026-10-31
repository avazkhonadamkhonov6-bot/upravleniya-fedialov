import { Injectable, Logger } from '@nestjs/common';
import { formatMoney, ONLINE_STATUS_LABELS, phoneDigits } from '@filialhub/shared';
import { localDay, startOfLocalDay } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { escape } from './notifications.service';
import { TelegramService } from './telegram.service';

/** Тугмаҳои мизоҷ дар бот */
export const CUSTOMER_KEYBOARD = {
  reply_markup: { keyboard: [[{ text: '📒 Қарзи ман' }, { text: '🛍 Фармоишҳои ман' }]], resize_keyboard: true },
};

/**
 * Боти Telegram барои мизоҷон (на кормандон): пас аз фиристодани рақам
 * мизоҷ қарзи худро дар ҳамаи мағозаҳо ва ҳолати фармоишҳои онлайнашро мебинад
 * ва хабарҳоро (қарз, пардохт, ёдрас, ҳолати фармоиш) дар Telegram мегирад — ройгон.
 */
@Injectable()
export class CustomerBotService {
  private readonly logger = new Logger('CustomerBot');

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  /** Рақами телефон → мизоҷони CRM (ҳамаи мағозаҳо) ва мизоҷи онлайн. Бармегардонад, ки кӣ ёфт шуд */
  async link(chatId: string, phone: string) {
    const last9 = phoneDigits(phone).slice(-9);
    if (last9.length < 9) return null;
    // Мизоҷони CRM рақамро ҳамчун +992XXXXXXXXX нигоҳ медоранд; онлайн — озод (бо фосила)
    const customers = await this.prisma.customer.findMany({ where: { phone: { endsWith: last9 } }, select: { id: true, fullName: true } });
    const candidates = await this.prisma.client.findMany({ where: { phone: { contains: last9.slice(-4) } }, select: { id: true, fullName: true, phone: true } });
    const clients = candidates.filter((c) => phoneDigits(c.phone).slice(-9) === last9);
    if (!customers.length && !clients.length) return null;
    await this.prisma.$transaction([
      // Як чат — як шахс: пайвастҳои кӯҳнаи ин чатро тоза мекунем
      this.prisma.customer.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      this.prisma.client.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      this.prisma.customer.updateMany({ where: { id: { in: customers.map((c) => c.id) } }, data: { telegramChatId: chatId } }),
      this.prisma.client.updateMany({ where: { id: { in: clients.map((c) => c.id) } }, data: { telegramChatId: chatId } }),
    ]);
    return customers[0]?.fullName ?? clients[0]?.fullName ?? '';
  }

  async isLinked(chatId: string) {
    const [c, k] = await Promise.all([
      this.prisma.customer.count({ where: { telegramChatId: chatId } }),
      this.prisma.client.count({ where: { telegramChatId: chatId } }),
    ]);
    return c + k > 0;
  }

  /** Ҷавоб ба тугмаҳо ва командаҳо; null — команда нест */
  async command(chatId: string, text: string): Promise<string | null> {
    const t = text.toLowerCase();
    if (t.includes('қарз') || t.startsWith('/debt') || t.startsWith('/qarz')) return this.debts(chatId);
    if (t.includes('фармоиш') || t.startsWith('/orders')) return this.orders(chatId);
    return null;
  }

  private async debts(chatId: string) {
    const rows = await this.prisma.customer.findMany({
      where: { telegramChatId: chatId, debt: { gt: 0 } },
      include: { organization: { select: { name: true } } },
      orderBy: { debt: 'desc' },
    });
    if (!rows.length) return '✅ Шумо қарз надоред. Ташаккур!';
    const total = rows.reduce((s, r) => s + Number(r.debt), 0);
    const today = startOfLocalDay();
    const due = (d: Date | null) =>
      !d ? '' : d < today ? ` · ⏰ мӯҳлат гузашт (${localDay(d).split('-').reverse().join('.')})` : ` · мӯҳлат ${localDay(d).split('-').reverse().join('.')}`;
    const lines = rows.map((r) => `• <b>${escape(r.organization.name)}</b>: ${formatMoney(Number(r.debt))}${due(r.debtDueAt)}`);
    return `📒 <b>Қарзи шумо</b>\n${lines.join('\n')}${rows.length > 1 ? `\n\nҲамагӣ: <b>${formatMoney(total)}</b>` : ''}`;
  }

  private async orders(chatId: string) {
    const rows = await this.prisma.onlineOrder.findMany({
      where: { client: { telegramChatId: chatId } },
      include: { organization: { select: { name: true } } },
      orderBy: { id: 'desc' },
      take: 5,
    });
    if (!rows.length) return '🛍 Фармоиши онлайн нест.';
    return `🛍 <b>Фармоишҳои охирин</b>\n${rows
      .map((o) => `• #${o.id} ${escape(o.organization.name)} — ${formatMoney(Number(o.total))} · <b>${ONLINE_STATUS_LABELS[o.status]}</b>`)
      .join('\n')}`;
  }

  /** Хабар ба мизоҷи CRM-и пайвастшуда; false — пайваст нест ё нарасид */
  async notifyCustomer(customer: { telegramChatId: string | null }, text: string) {
    if (!customer.telegramChatId) return false;
    const r = await this.telegram.send(customer.telegramChatId, escape(text)).catch((e: Error) => {
      this.logger.warn(e.message);
      return null;
    });
    return r?.status === 'SENT';
  }

  /** Ҳолати фармоиши онлайн ба мизоҷ */
  async notifyClient(clientId: number | null, text: string) {
    if (!clientId) return;
    const c = await this.prisma.client.findUnique({ where: { id: clientId }, select: { telegramChatId: true } });
    if (c?.telegramChatId) await this.telegram.send(c.telegramChatId, text).catch(() => null);
  }

  get botUsername() {
    return this.telegram.botUsername;
  }
}
