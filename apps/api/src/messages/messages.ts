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
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CHANNELS,
  MEDIA_MAX_BYTES,
  VIDEO_NOTE_MAX_SECONDS,
  VOICE_MAX_SECONDS,
  type Channel,
  type ChatContact,
  type ChatMessage,
  type ContactInfo,
  type MessageResult,
} from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { Prisma } from '../generated/prisma/client';
import { ChatService, toChatMessage, withMediaMime } from '../notifications/chat.service';
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

  /** Паёмҳои як канал + зангҳо ва паёмҳои танҳо-сайт (channel = null), ки дар ҳарду чат намоёнанд */
  private inChannel(channel?: Channel): Prisma.MessageWhereInput {
    return channel ? { OR: [{ channel }, { channel: null }] } : {};
  }

  async contacts(user: AuthUser, channel?: Channel): Promise<{ contacts: ChatContact[]; configured: { telegram: boolean; whatsapp: boolean } }> {
    const users = await this.prisma.user.findMany({ where: await this.scope(user), include: { branch: true } });
    const ids = users.map((u) => u.id);
    // Паёми охирин бо ҳар кас ва шумораи нохондашудаҳо
    const recent = await this.prisma.message.findMany({
      where: {
        AND: [
          { OR: [{ senderId: user.id, recipientId: { in: ids } }, { recipientId: user.id, senderId: { in: ids } }] },
          this.inChannel(channel),
        ],
      },
      orderBy: { id: 'desc' },
      take: 2000,
    });
    const unread = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: { recipientId: user.id, readAt: null, ...this.inChannel(channel) },
      _count: true,
    });
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
  async thread(user: AuthUser, otherId: number, after?: number, channel?: Channel): Promise<ChatMessage[]> {
    await this.ensureCanTalk(user, otherId);
    const where: Prisma.MessageWhereInput = {
      AND: [
        {
          OR: [
            { senderId: user.id, recipientId: otherId },
            { senderId: otherId, recipientId: user.id },
          ],
        },
        this.inChannel(channel),
      ],
      ...(after ? { id: { gt: after } } : {}),
    };
    const rows = await this.prisma.message.findMany({ where, orderBy: { id: 'desc' }, take: 200, include: withMediaMime });
    await this.prisma.message.updateMany({ where: { senderId: otherId, recipientId: user.id, readAt: null, ...this.inChannel(channel) }, data: { readAt: new Date() } });
    return rows.reverse().map(toChatMessage);
  }

  /** Паёми овозӣ ё видеои мудаввар (бадан — худи файл, Content-Type — audio/* ё video/*). */
  async sendMedia(
    user: AuthUser,
    q: { to: number; kind: string; duration: number; channels: Channel[] },
    body: Buffer,
    mime: string,
  ): Promise<{ message: ChatMessage; results: MessageResult[] }> {
    const kind = q.kind === 'VIDEO_NOTE' ? 'VIDEO_NOTE' : q.kind === 'VOICE' ? 'VOICE' : null;
    if (!kind) throw new BadRequestException('Навъи паём нодуруст аст');
    if (!Buffer.isBuffer(body) || body.length === 0) throw new BadRequestException('Файл холӣ аст');
    if (body.length > MEDIA_MAX_BYTES) throw new BadRequestException('Файл хеле калон аст (то 15 МБ)');
    const base = mime.split(';')[0].trim();
    if (!(kind === 'VOICE' ? base.startsWith('audio/') : base.startsWith('video/'))) throw new BadRequestException('Формати файл нодуруст аст');
    const max = kind === 'VOICE' ? VOICE_MAX_SECONDS : VIDEO_NOTE_MAX_SECONDS;
    const duration = Math.min(Math.max(Math.round(q.duration) || 1, 1), max);
    await this.ensureCanTalk(user, q.to);

    const [sender, target] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: q.to } }),
    ]);
    const data = new Uint8Array(body);
    const media = await this.prisma.media.create({ data: { ownerId: user.id, mime: base, size: data.byteLength, data } });
    const message = await this.chat.deliverMedia(sender, target, { id: media.id, mime: base, data }, kind, duration, q.channels);
    const results: MessageResult[] = [];
    if (message.whatsappStatus) results.push({ userId: target.id, fullName: target.fullName, channel: 'WHATSAPP', status: message.whatsappStatus });
    if (message.telegramStatus) results.push({ userId: target.id, fullName: target.fullName, channel: 'TELEGRAM', status: message.telegramStatus });
    return { message, results };
  }

  /** Файл танҳо ба фиристанда ва қабулкунандаи паём дода мешавад. */
  async media(user: AuthUser, id: number) {
    const allowed = await this.prisma.message.count({ where: { mediaId: id, OR: [{ senderId: user.id }, { recipientId: user.id }] } });
    if (!allowed) throw new ForbiddenException('Ин файл барои шумо нест');
    return this.prisma.media.findUniqueOrThrow({ where: { id } });
  }

  /** «Дар бораи корманд»: ҳамаи маълумоти тамос; маош — танҳо барои шеф ва менеҷери ҳамон филиал. */
  async info(user: AuthUser, id: number): Promise<ContactInfo> {
    await this.ensureCanTalk(user, id);
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { branch: true } });
    const seesSalary = user.role === 'CHEF' || (user.role === 'MANAGER' && u.role === 'STAFF' && u.branchId === user.branchId);
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
      email: u.email,
      hiredAt: u.hiredAt.toISOString(),
      isActive: u.isActive,
      salary: seesSalary ? u.salary : null,
      payDay: seesSalary ? u.payDay : null,
    };
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

const asChannel = (c?: string): Channel | undefined => ((CHANNELS as readonly string[]).includes(c ?? '') ? (c as Channel) : undefined);

@Controller('messages')
@Feature('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('contacts')
  contacts(@CurrentUser() user: AuthUser, @Query('channel') channel?: string) {
    return this.messages.contacts(user, asChannel(channel));
  }

  @Get('contacts/:id')
  info(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.messages.info(user, id);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.messages.unread(user);
  }

  @Get('thread/:id')
  thread(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query('after') after?: string, @Query('channel') channel?: string) {
    return this.messages.thread(user, id, Number(after) || undefined, asChannel(channel));
  }

  @Post()
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.messages.send(user, dto);
  }

  /** POST /messages/media?to=5&kind=VOICE&duration=12&channels=TELEGRAM,WHATSAPP, бадан — файли овоз/видео */
  @Post('media')
  sendMedia(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Query('to', ParseIntPipe) to: number,
    @Query('kind') kind = '',
    @Query('duration') duration = '0',
    @Query('channels') channels = '',
  ) {
    const list = channels.split(',').filter((c): c is Channel => (CHANNELS as readonly string[]).includes(c));
    return this.messages.sendMedia(user, { to, kind, duration: Number(duration), channels: list }, req.body as Buffer, req.headers['content-type'] ?? '');
  }

  @Get('media/:id')
  async media(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const m = await this.messages.media(user, id);
    res.setHeader('Content-Type', m.mime);
    res.setHeader('Content-Length', String(m.size));
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.end(Buffer.from(m.data));
  }
}

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
