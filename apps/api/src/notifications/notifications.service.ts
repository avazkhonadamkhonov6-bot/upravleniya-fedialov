import { Injectable } from '@nestjs/common';
import { POSITION_LABELS, ROLE_LABELS } from '@filialhub/shared';
import type { Branch, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { WhatsAppService } from './whatsapp.service';

type Recipient = Pick<User, 'id' | 'phone' | 'telegramChatId'> & Partial<Pick<User, 'whatsapp'>>;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Ба корбар тавассути Telegram (агар пайваст бошад) ва WhatsApp паём мефиристад ва натиҷаро сабт мекунад. */
  async notifyUser(user: Recipient, text: string) {
    const jobs: Promise<unknown>[] = [];
    if (user.telegramChatId) {
      jobs.push(
        this.telegram.send(user.telegramChatId, text).then((r) =>
          this.log('TELEGRAM', user.telegramChatId!, user.id, text, r.status, r.error),
        ),
      );
    }
    // Агар корманд рақами алоҳидаи WhatsApp дошта бошад — ба он, вагарна ба телефон.
    const wa = user.whatsapp || user.phone;
    if (wa) {
      const plain = text.replace(/<[^>]+>/g, '');
      jobs.push(this.whatsapp.send(wa, plain).then((r) => this.log('WHATSAPP', wa, user.id, plain, r.status, r.error)));
    }
    await Promise.all(jobs);
  }

  async notifyBranchManagers(branchId: number, text: string, exceptUserId?: number) {
    const managers = await this.prisma.user.findMany({
      where: { branchId, role: 'MANAGER', isActive: true, id: exceptUserId ? { not: exceptUserId } : undefined },
    });
    await Promise.all(managers.map((m) => this.notifyUser(m, text)));
  }

  async welcome(user: User & { branch?: Branch | null }) {
    const role = user.position ? POSITION_LABELS[user.position] : ROLE_LABELS[user.role];
    const where = user.branch ? ` дар филиали «${user.branch.name}» (${user.branch.city})` : '';
    const bot = this.telegram.botUsername
      ? `\n\nБарои гирифтани огоҳиномаҳо ботро кушоед: https://t.me/${this.telegram.botUsername} ва /start нависед.`
      : '';
    await this.notifyUser(
      user,
      `🎉 Хуш омадед ба FilialHub, ${escape(user.fullName)}!\nШумо ҳамчун <b>${role}</b>${where} сабт шудед.\nВуруд: ${user.email}${bot}`,
    );
  }

  private log(
    channel: 'TELEGRAM' | 'WHATSAPP',
    to: string,
    userId: number,
    text: string,
    status: 'SENT' | 'DRY_RUN' | 'FAILED',
    error?: string,
  ) {
    return this.prisma.notification.create({ data: { channel, to, userId, text, status, error } });
  }
}

export function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
