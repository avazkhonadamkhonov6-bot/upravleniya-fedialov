import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, Module, Post } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CHANNELS,
  POSITION_LABELS,
  ROLE_LABELS,
  type Channel,
  type MessageLog,
  type MessageRecipients,
  type MessageResult,
} from '@filialhub/shared';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { AlertsService } from '../core/alerts.service';
import { Prisma } from '../generated/prisma/client';
import { escape, NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export class SendMessageDto {
  @IsArray() @ArrayMinSize(1, { message: 'Қабулкунандаро интихоб кунед' }) @ArrayMaxSize(200) @IsInt({ each: true })
  userIds: number[];

  @IsString() @MinLength(1, { message: 'Матни паёмро нависед' }) @MaxLength(2000, { message: 'Паём хеле дароз аст' })
  text: string;

  @IsArray() @ArrayMinSize(1, { message: 'WhatsApp ё Telegram-ро интихоб кунед' }) @IsIn(CHANNELS, { each: true })
  channels: Channel[];
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly alerts: AlertsService,
  ) {}

  /**
   * Ба кӣ навиштан мумкин:
   * шеф — ба ҳама; менеҷер — ба кормандони филиали худ ва шеф; корманд — ба менеҷери филиал ва шеф.
   */
  private scope(user: AuthUser): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = { isActive: true, id: { not: user.id } };
    if (user.role === 'CHEF') return base;
    const own = user.branchId ?? -1;
    if (user.role === 'MANAGER') return { ...base, OR: [{ branchId: own }, { role: 'CHEF' }] };
    return { ...base, OR: [{ branchId: own, role: 'MANAGER' }, { role: 'CHEF' }] };
  }

  async recipients(user: AuthUser): Promise<MessageRecipients> {
    const users = await this.prisma.user.findMany({
      where: this.scope(user),
      include: { branch: true },
      orderBy: [{ role: 'asc' }, { branchId: 'asc' }, { fullName: 'asc' }],
    });
    return {
      recipients: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        branchId: u.branchId,
        branchName: u.branch?.name ?? null,
        phone: u.phone,
        whatsapp: u.whatsapp,
        telegram: u.telegram,
        telegramLinked: !!u.telegramChatId,
      })),
      configured: this.notifications.configured,
    };
  }

  async send(user: AuthUser, dto: SendMessageDto): Promise<MessageResult[]> {
    const ids = [...new Set(dto.userIds)];
    const targets = await this.prisma.user.findMany({ where: { AND: [this.scope(user), { id: { in: ids } }] } });
    if (targets.length !== ids.length) throw new ForbiddenException('Ба баъзе қабулкунандагон навиштан мумкин нест');
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Матни паёмро нависед');

    const label = user.position ? POSITION_LABELS[user.position] : ROLE_LABELS[user.role];
    const body = `✉️ <b>${escape(user.fullName)}</b> (${label}):\n${escape(text)}`;
    const results: MessageResult[] = [];
    for (const t of targets) {
      const sent = await this.notifications.sendDirect(user.id, t, body, dto.channels);
      sent.forEach((r) => results.push({ userId: t.id, fullName: t.fullName, ...r }));
    }
    // Паём дар худи сайт ҳам (🔔) намоён мешавад.
    this.alerts.notify(
      targets.map((t) => t.id),
      { icon: '✉️', title: `Паём аз ${user.fullName}`, body: text.slice(0, 200), link: '/messages' },
    );
    return results;
  }

  /** Таърих: шеф ҳамаи паёмҳои дастиро мебинад, дигарон — фиристода ва гирифтаи худро. */
  async history(user: AuthUser): Promise<MessageLog[]> {
    const where: Prisma.NotificationWhereInput =
      user.role === 'CHEF' ? { senderId: { not: null } } : { senderId: { not: null }, OR: [{ senderId: user.id }, { userId: user.id }] };
    const rows = await this.prisma.notification.findMany({ where, orderBy: { id: 'desc' }, take: 100 });
    const ids = [...new Set(rows.flatMap((r) => [r.userId, r.senderId]).filter((x): x is number => x !== null))];
    const names = new Map((await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } })).map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      to: r.to,
      status: r.status,
      error: r.error,
      text: r.text,
      recipientId: r.userId,
      recipientName: r.userId ? (names.get(r.userId) ?? null) : null,
      senderName: r.senderId ? (names.get(r.senderId) ?? null) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('recipients')
  recipients(@CurrentUser() user: AuthUser) {
    return this.messages.recipients(user);
  }

  @Get()
  history(@CurrentUser() user: AuthUser) {
    return this.messages.history(user);
  }

  @Post()
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.messages.send(user, dto);
  }
}

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
