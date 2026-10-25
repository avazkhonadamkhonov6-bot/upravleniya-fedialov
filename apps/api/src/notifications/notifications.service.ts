import { Injectable } from '@nestjs/common';
import { POSITION_LABELS, ROLE_LABELS, type Channel, type DeliveryStatus } from '@filialhub/shared';
import type { Branch, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { htmlToWhatsApp, WhatsAppService } from './whatsapp.service';

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
      const plain = htmlToWhatsApp(text);
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

  /** Флагҳо барои саҳифаи «Паёмҳо»: оё фиристодан аз сервер имкон дорад */
  get configured() {
    return { telegram: this.telegram.configured, whatsapp: this.whatsapp.configured };
  }

  /**
   * Паёми дастӣ аз як корбар ба корбари дигар тавассути каналҳои интихобшуда.
   * Ҳар кӯшиш бо senderId сабт мешавад, то дар таърихи паёмҳо намоён бошад.
   */
  async sendDirect(
    senderId: number,
    user: Pick<User, 'id' | 'phone' | 'whatsapp' | 'telegramChatId'>,
    text: string,
    channels: Channel[],
  ): Promise<{ channel: Channel; status: DeliveryStatus; error?: string }[]> {
    const results: { channel: Channel; status: DeliveryStatus; error?: string }[] = [];
    const plain = htmlToWhatsApp(text);
    if (channels.includes('TELEGRAM')) {
      if (!user.telegramChatId) {
        results.push({ channel: 'TELEGRAM', status: 'NOT_LINKED' });
      } else {
        const r = await this.telegram.send(user.telegramChatId, text);
        await this.log('TELEGRAM', user.telegramChatId, user.id, plain, r.status, r.error, senderId);
        results.push({ channel: 'TELEGRAM', ...r });
      }
    }
    if (channels.includes('WHATSAPP')) {
      const wa = user.whatsapp || user.phone;
      if (!wa) results.push({ channel: 'WHATSAPP', status: 'NOT_LINKED' });
      else {
        const r = await this.whatsapp.send(wa, plain);
        await this.log('WHATSAPP', wa, user.id, plain, r.status, r.error, senderId);
        results.push({ channel: 'WHATSAPP', ...r });
      }
    }
    return results;
  }

  /** Нусхаи паёми овозӣ/видеоӣ ба каналҳои интихобшуда */
  async sendDirectMedia(
    senderId: number,
    user: Pick<User, 'id' | 'phone' | 'whatsapp' | 'telegramChatId'>,
    media: { mime: string; data: Uint8Array<ArrayBuffer> },
    kind: 'VOICE' | 'VIDEO_NOTE',
    caption: string,
    channels: Channel[],
  ): Promise<{ channel: Channel; status: DeliveryStatus; error?: string }[]> {
    const results: { channel: Channel; status: DeliveryStatus; error?: string }[] = [];
    const label = kind === 'VOICE' ? '[паёми овозӣ]' : '[видеопаём]';
    if (channels.includes('TELEGRAM')) {
      if (!user.telegramChatId) results.push({ channel: 'TELEGRAM', status: 'NOT_LINKED' });
      else {
        const r = await this.telegram.sendMedia(user.telegramChatId, kind, media.data, media.mime, caption);
        await this.log('TELEGRAM', user.telegramChatId, user.id, label, r.status, r.error, senderId);
        results.push({ channel: 'TELEGRAM', ...r });
      }
    }
    if (channels.includes('WHATSAPP')) {
      const wa = user.whatsapp || user.phone;
      const r = await this.whatsapp.sendMedia(wa, kind, media.data, media.mime, htmlToWhatsApp(caption));
      await this.log('WHATSAPP', wa, user.id, label, r.status, r.error, senderId);
      results.push({ channel: 'WHATSAPP', ...r });
    }
    return results;
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
    senderId?: number,
  ) {
    return this.prisma.notification.create({ data: { channel, to, userId, text, status, error, senderId } });
  }
}

export function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
