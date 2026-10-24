import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { CHANNELS, type Channel, type ChatContact, type ChatMessage, type MessageResult } from '@filialhub/shared';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { Prisma } from '../generated/prisma/client';
import { ChatService, toChatMessage } from '../notifications/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export class SendMessageDto {
  @IsArray() @ArrayMinSize(1, { message: 'Қабулкунандаро интихоб кунед' }) @ArrayMaxSize(200) @IsInt({ each: true })
  userIds: number[];

  @IsString() @MinLength(1, { message: 'Матни паёмро нависед' }) @MaxLength(2000, { message: 'Паём хеле дароз аст' })
  text: string;

  /** Нусха ба WhatsApp/Telegram (метавонад холӣ бошад — танҳо дар сайт) */
  @IsArray() @IsIn(CHANNELS, { each: true })
  channels: Channel[];
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Ба кӣ навиштан мумкин:
   * шеф — ба ҳама; менеҷер — ба кормандони филиали худ ва шеф; корманд — ба менеҷери филиал ва шеф.
   * Илова бар ин ба ҳар касе, ки ба шумо навишта буд, ҷавоб додан мумкин аст.
   */
  private async scope(user: AuthUser): Promise<Prisma.UserWhereInput> {
    const base: Prisma.UserWhereInput = { isActive: true, id: { not: user.id } };
    if (user.role === 'CHEF') return base;
    const own = user.branchId ?? -1;
    const wroteToMe = (await this.prisma.message.findMany({ where: { recipientId: user.id }, select: { senderId: true }, distinct: ['senderId'] })).map(
      (m) => m.senderId,
    );
    const allowed: Prisma.UserWhereInput[] =
      user.role === 'MANAGER' ? [{ branchId: own }, { role: 'CHEF' }] : [{ branchId: own, role: 'MANAGER' }, { role: 'CHEF' }];
    if (wroteToMe.length) allowed.push({ id: { in: wroteToMe } });
    return { ...base, OR: allowed };
  }

  async contacts(user: AuthUser): Promise<{ contacts: ChatContact[]; configured: { telegram: boolean; whatsapp: boolean } }> {
    const users = await this.prisma.user.findMany({ where: await this.scope(user), include: { branch: true } });
    const ids = users.map((u) => u.id);
    // Паёми охирин бо ҳар кас ва шумораи нохондашудаҳо
    const recent = await this.prisma.message.findMany({
      where: { OR: [{ senderId: user.id, recipientId: { in: ids } }, { recipientId: user.id, senderId: { in: ids } }] },
      orderBy: { id: 'desc' },
      take: 2000,
    });
    const unread = await this.prisma.message.groupBy({ by: ['senderId'], where: { recipientId: user.id, readAt: null }, _count: true });
    const last = new Map<number, (typeof recent)[number]>();
    for (const m of recent) {
      const other = m.senderId === user.id ? m.recipientId : m.senderId;
      if (!last.has(other)) last.set(other, m);
    }
    const contacts: ChatContact[] = users.map((u) => {
      const m = last.get(u.id);
      return {
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
        lastMessage: m ? { text: m.text, createdAt: m.createdAt.toISOString(), mine: m.senderId === user.id } : null,
        unread: unread.find((x) => x.senderId === u.id)?._count ?? 0,
      };
    });
    // Аввал суҳбатҳои охирин, баъд аз рӯи нақш ва ном
    const roleOrder = { CHEF: 0, MANAGER: 1, STAFF: 2 } as const;
    contacts.sort(
      (a, b) =>
        (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? '') ||
        roleOrder[a.role] - roleOrder[b.role] ||
        a.fullName.localeCompare(b.fullName),
    );
    return { contacts, configured: this.notifications.configured };
  }

  private async ensureCanTalk(user: AuthUser, otherId: number) {
    const ok = await this.prisma.user.count({ where: { AND: [await this.scope(user), { id: otherId }] } });
    if (!ok) throw new ForbiddenException('Ба ин корбар навиштан мумкин нест');
  }

  /** Суҳбат бо як нафар. after — танҳо паёмҳои нав (барои навсозии худкор). Паёмҳои воридшуда хондашуда мешаванд. */
  async thread(user: AuthUser, otherId: number, after?: number): Promise<ChatMessage[]> {
    await this.ensureCanTalk(user, otherId);
    const where: Prisma.MessageWhereInput = {
      OR: [
        { senderId: user.id, recipientId: otherId },
        { senderId: otherId, recipientId: user.id },
      ],
      ...(after ? { id: { gt: after } } : {}),
    };
    const rows = await this.prisma.message.findMany({ where, orderBy: { id: 'desc' }, take: 200 });
    await this.prisma.message.updateMany({ where: { senderId: otherId, recipientId: user.id, readAt: null }, data: { readAt: new Date() } });
    return rows.reverse().map(toChatMessage);
  }

  async unread(user: AuthUser) {
    return { count: await this.prisma.message.count({ where: { recipientId: user.id, readAt: null } }) };
  }

  async send(user: AuthUser, dto: SendMessageDto): Promise<{ messages: ChatMessage[]; results: MessageResult[] }> {
    const ids = [...new Set(dto.userIds)];
    const targets = await this.prisma.user.findMany({ where: { AND: [await this.scope(user), { id: { in: ids } }] } });
    if (targets.length !== ids.length) throw new ForbiddenException('Ба баъзе қабулкунандагон навиштан мумкин нест');
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Матни паёмро нависед');

    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const messages: ChatMessage[] = [];
    const results: MessageResult[] = [];
    for (const t of targets) {
      const m = await this.chat.deliver(sender, t, text, dto.channels);
      messages.push(m);
      if (m.whatsappStatus) results.push({ userId: t.id, fullName: t.fullName, channel: 'WHATSAPP', status: m.whatsappStatus });
      if (m.telegramStatus) results.push({ userId: t.id, fullName: t.fullName, channel: 'TELEGRAM', status: m.telegramStatus });
    }
    return { messages, results };
  }
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('contacts')
  contacts(@CurrentUser() user: AuthUser) {
    return this.messages.contacts(user);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.messages.unread(user);
  }

  @Get('thread/:id')
  thread(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query('after') after?: string) {
    return this.messages.thread(user, id, Number(after) || undefined);
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
