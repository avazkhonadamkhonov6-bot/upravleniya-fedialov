import { Injectable, Logger } from '@nestjs/common';
import { phoneDigits, POSITION_LABELS, ROLE_LABELS, type Channel, type ChatMessage, type MessageKind, type MessageSource } from '@filialhub/shared';
import { AlertsService } from '../core/alerts.service';
import type { Media, Message, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { escape, NotificationsService } from './notifications.service';

/** Барои паёмҳо ҳамеша mime-и файлро ҳам мегирем (на худи файлро). */
export const withMediaMime = { media: { select: { mime: true } } } as const;

export function toChatMessage(m: Message & { media?: { mime: string } | null }): ChatMessage {
  return {
    id: m.id,
    senderId: m.senderId,
    recipientId: m.recipientId,
    text: m.text,
    kind: m.kind as MessageKind,
    channel: (m.channel as Channel | null) ?? null,
    mediaId: m.mediaId,
    mime: m.media?.mime ?? null,
    durationSec: m.durationSec,
    source: m.source as MessageSource,
    whatsappStatus: (m.whatsappStatus as ChatMessage['whatsappStatus']) ?? null,
    telegramStatus: (m.telegramStatus as ChatMessage['telegramStatus']) ?? null,
    readAt: m.readAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * Ядрои чат: паём дар сайт сабт мешавад ва нусхааш ба WhatsApp/Telegram меравад.
 * Ҷавобҳое, ки корманд дар Telegram ё WhatsApp менависад, ба ҳамон чат бармегарданд.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger('Chat');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly alerts: AlertsService,
  ) {}

  async deliver(
    sender: Pick<User, 'id' | 'fullName' | 'role' | 'position'>,
    recipient: Pick<User, 'id' | 'phone' | 'whatsapp' | 'telegramChatId'>,
    text: string,
    channels: Channel[],
  ): Promise<ChatMessage> {
    const channel = channels.length === 1 ? channels[0] : null;
    const message = await this.prisma.message.create({ data: { senderId: sender.id, recipientId: recipient.id, text, channel } });

    const label = sender.position ? POSITION_LABELS[sender.position] : ROLE_LABELS[sender.role];
    const body = `✉️ <b>${escape(sender.fullName)}</b> (${label}):\n${escape(text)}\n\n<i>Ҷавобро дар ҳамин ҷо нависед — он ба FilialHub меравад.</i>`;
    const results = channels.length ? await this.notifications.sendDirect(sender.id, recipient, body, channels) : [];
    const status = (c: Channel) => results.find((r) => r.channel === c)?.status ?? null;
    const updated = await this.prisma.message.update({
      where: { id: message.id },
      data: { whatsappStatus: status('WHATSAPP'), telegramStatus: status('TELEGRAM') },
      include: withMediaMime,
    });

    this.alerts.notify(recipient.id, { icon: '✉️', title: `Паём аз ${sender.fullName}`, body: text.slice(0, 200), link: `/messages?to=${sender.id}` });
    return toChatMessage(updated);
  }

  /**
   * Ҷавоби корманд аз Telegram ё WhatsApp: ба касе меравад, ки охирин бор ба ӯ навишта буд;
   * агар чунин кас набошад — ба менеҷери филиал, барои менеҷер — ба шеф.
   */
  async routeIncoming(from: User, text: string, source: Exclude<MessageSource, 'WEB'>): Promise<User | null> {
    const targetId = await this.replyTarget(from);
    if (!targetId) return null;

    await this.prisma.message.create({ data: { senderId: from.id, recipientId: targetId, text, source, channel: source } });
    this.alerts.notify(targetId, { icon: '💬', title: `Ҷавоб аз ${from.fullName}`, body: text.slice(0, 200), link: `/messages?to=${from.id}` });
    this.logger.log(`${source} → чат: ${from.fullName} → #${targetId}`);
    return this.prisma.user.findUnique({ where: { id: targetId } });
  }

  /** Паёми овозӣ ё видеои мудаввар: файл дар база, нусха ба Telegram/WhatsApp ҳамчун файли овоз/видео. */
  async deliverMedia(
    sender: Pick<User, 'id' | 'fullName' | 'role' | 'position'>,
    recipient: Pick<User, 'id' | 'phone' | 'whatsapp' | 'telegramChatId'>,
    media: Pick<Media, 'id' | 'mime' | 'data'>,
    kind: 'VOICE' | 'VIDEO_NOTE',
    durationSec: number,
    channels: Channel[],
  ): Promise<ChatMessage> {
    const text = kind === 'VOICE' ? '🎤 Паёми овозӣ' : '🎥 Видеопаём';
    const message = await this.prisma.message.create({
      data: { senderId: sender.id, recipientId: recipient.id, text, kind, mediaId: media.id, durationSec, channel: channels.length === 1 ? channels[0] : null },
    });
    const label = sender.position ? POSITION_LABELS[sender.position] : ROLE_LABELS[sender.role];
    const caption = `${kind === 'VOICE' ? '🎤' : '🎥'} <b>${escape(sender.fullName)}</b> (${label})`;
    const results = channels.length ? await this.notifications.sendDirectMedia(sender.id, recipient, media, kind, caption, channels) : [];
    const status = (c: Channel) => results.find((r) => r.channel === c)?.status ?? null;
    const updated = await this.prisma.message.update({
      where: { id: message.id },
      data: { whatsappStatus: status('WHATSAPP'), telegramStatus: status('TELEGRAM') },
      include: withMediaMime,
    });
    this.alerts.notify(recipient.id, { icon: kind === 'VOICE' ? '🎤' : '🎥', title: `${text} аз ${sender.fullName}`, body: `${durationSec} сония`, link: `/messages?to=${sender.id}` });
    return toChatMessage(updated);
  }

  /** Овоз/видео аз Telegram ё WhatsApp → ба чати сайт. */
  async routeIncomingMedia(
    from: User,
    file: { data: Uint8Array<ArrayBuffer>; mime: string },
    kind: 'VOICE' | 'VIDEO_NOTE',
    durationSec: number,
    source: Exclude<MessageSource, 'WEB'>,
  ): Promise<User | null> {
    const target = await this.replyTarget(from);
    if (!target) return null;
    const media = await this.prisma.media.create({ data: { ownerId: from.id, mime: file.mime, size: file.data.byteLength, data: file.data } });
    const text = kind === 'VOICE' ? '🎤 Паёми овозӣ' : '🎥 Видеопаём';
    await this.prisma.message.create({ data: { senderId: from.id, recipientId: target, text, kind, mediaId: media.id, durationSec, source, channel: source } });
    this.alerts.notify(target, { icon: '💬', title: `${text} аз ${from.fullName}`, body: `${durationSec} сония`, link: `/messages?to=${from.id}` });
    return this.prisma.user.findUnique({ where: { id: target } });
  }

  private async replyTarget(from: User): Promise<number | undefined> {
    const last = await this.prisma.message.findFirst({ where: { recipientId: from.id }, orderBy: { id: 'desc' } });
    let targetId = last?.senderId;
    if (!targetId && from.role === 'STAFF' && from.branchId) {
      targetId = (await this.prisma.user.findFirst({ where: { branchId: from.branchId, role: 'MANAGER', isActive: true } }))?.id;
    }
    if (!targetId) targetId = (await this.prisma.user.findFirst({ where: { role: 'CHEF', isActive: true, id: { not: from.id } } }))?.id;
    return targetId;
  }

  /** Корбарро аз рӯи рақами телефон ё WhatsApp меёбад (9 рақами охир). */
  async findByPhone(phone: string): Promise<User | null> {
    const digits = phoneDigits(phone).slice(-9);
    if (digits.length < 9) return null;
    const users = await this.prisma.user.findMany({ where: { isActive: true } });
    return users.find((u) => [u.phone, u.whatsapp].some((p) => p && phoneDigits(p).slice(-9) === digits)) ?? null;
  }
}
