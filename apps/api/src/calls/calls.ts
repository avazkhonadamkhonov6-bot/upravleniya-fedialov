import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CALL_RING_SECONDS, canAccess, type CallInfo, type CallStatus } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import type { Call, User } from '../generated/prisma/client';
import { AlertsService } from '../core/alerts.service';
import { EventsService } from '../core/events';
import { PushService } from '../core/push';
import { PrismaService } from '../prisma/prisma.service';

export class StartCallDto {
  @IsInt()
  calleeId: number;

  @IsOptional() @IsBoolean()
  video?: boolean;

  /** SDP-и пешниҳод бо ҳамаи ICE-номзадҳо (non-trickle) */
  @IsString() @MinLength(10) @MaxLength(100_000)
  offer: string;
}

export class AnswerCallDto {
  @IsString() @MinLength(10) @MaxLength(100_000)
  answer: string;
}

type CallWithPeople = Call & { caller: Pick<User, 'fullName'>; callee: Pick<User, 'fullName'> };
const people = { caller: { select: { fullName: true } }, callee: { select: { fullName: true } } } as const;

function toCall(c: CallWithPeople, viewerId: number): CallInfo {
  return {
    id: c.id,
    callerId: c.callerId,
    calleeId: c.calleeId,
    callerName: c.caller.fullName,
    calleeName: c.callee.fullName,
    video: c.video,
    status: c.status as CallStatus,
    // Ҳар тараф танҳо SDP-и тарафи дигарро мегирад.
    offer: viewerId === c.calleeId ? c.offer : null,
    answer: viewerId === c.callerId ? c.answer : null,
    createdAt: c.createdAt.toISOString(),
    answeredAt: c.answeredAt?.toISOString() ?? null,
  };
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * Зангҳои аудио/видео бо WebRTC (браузер ↔ браузер). Сервер танҳо пешниҳод/ҷавобро нигоҳ медорад (сигнал),
 * худи овоз ва видео мустақим байни ду браузер меравад.
 * Занг задан — танҳо ба касоне, ки ба онҳо паём навиштан мумкин аст (шеф, менеҷер). Қабули занг — ҳама.
 */
@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly events: EventsService,
    private readonly push: PushService,
  ) {}

  async start(user: AuthUser, dto: StartCallDto): Promise<CallInfo> {
    if (!canAccess(user, 'messages')) throw new ForbiddenException('Шумо занг зада наметавонед');
    if (dto.calleeId === user.id) throw new BadRequestException('Ба худатон занг зада намешавад');
    const callee = await this.prisma.user.findFirst({ where: { id: dto.calleeId, isActive: true, organizationId: user.organizationId } });
    if (!callee) throw new NotFoundException('Корбар ёфт нашуд');
    if (user.role === 'MANAGER' && callee.role !== 'CHEF' && callee.branchId !== user.branchId) {
      throw new ForbiddenException('Танҳо ба кормандони филиали худ ва шеф');
    }
    if (await this.prisma.call.count({ where: { calleeId: callee.id, status: 'ACTIVE' } })) {
      throw new BadRequestException(`${callee.fullName} ҳоло дар занги дигар аст`);
    }
    // Зангҳои кӯҳнаи ин зангзананда, ки ҳанӯз «занг мезананд», бекор мешаванд.
    await this.prisma.call.updateMany({ where: { callerId: user.id, status: 'RINGING' }, data: { status: 'CANCELLED', endedAt: new Date() } });
    const call = await this.prisma.call.create({
      data: { callerId: user.id, calleeId: callee.id, video: !!dto.video, offer: dto.offer },
      include: people,
    });
    this.events.emit(callee.id, 'calls');
    // Телефон занг мезанад, ҳатто агар сайт пӯшида бошад
    this.push.send(callee.id, { title: `${dto.video ? '🎥' : '📞'} ${user.fullName} занг мезанад`, body: 'Барои ҷавоб пахш кунед', url: '/messages', tag: 'call' });
    return toCall(call, user.id);
  }

  /** Занги воридшаванда (агар бошад). Зангҳои кӯҳнатар аз 45 сония «беҷавоб» мешаванд. */
  async incoming(user: AuthUser): Promise<CallInfo | null> {
    await this.expireRinging();
    const call = await this.prisma.call.findFirst({
      where: { calleeId: user.id, status: 'RINGING' },
      orderBy: { id: 'desc' },
      include: people,
    });
    return call ? toCall(call, user.id) : null;
  }

  async get(user: AuthUser, id: number): Promise<CallInfo> {
    await this.expireRinging();
    return toCall(await this.mine(user, id), user.id);
  }

  async answer(user: AuthUser, id: number, dto: AnswerCallDto): Promise<CallInfo> {
    const call = await this.mine(user, id);
    if (call.calleeId !== user.id) throw new ForbiddenException('Ин занг ба шумо нест');
    if (call.status !== 'RINGING') throw new BadRequestException('Занг аллакай тамом шудааст');
    const updated = await this.prisma.call.update({
      where: { id },
      data: { status: 'ACTIVE', answer: dto.answer, answeredAt: new Date() },
      include: people,
    });
    this.events.emit(call.callerId, 'calls');
    return toCall(updated, user.id);
  }

  async decline(user: AuthUser, id: number): Promise<CallInfo> {
    const call = await this.mine(user, id);
    if (call.status !== 'RINGING') return toCall(call, user.id);
    return this.finish(call, call.calleeId === user.id ? 'DECLINED' : 'CANCELLED', user.id);
  }

  async end(user: AuthUser, id: number): Promise<CallInfo> {
    const call = await this.mine(user, id);
    if (call.status === 'RINGING') return this.finish(call, call.calleeId === user.id ? 'DECLINED' : 'CANCELLED', user.id);
    if (call.status !== 'ACTIVE') return toCall(call, user.id);
    return this.finish(call, 'ENDED', user.id);
  }

  private async mine(user: AuthUser, id: number): Promise<CallWithPeople> {
    const call = await this.prisma.call.findUnique({ where: { id }, include: people });
    if (!call) throw new NotFoundException('Занг ёфт нашуд');
    if (call.callerId !== user.id && call.calleeId !== user.id) throw new ForbiddenException('Ин занг ба шумо нест');
    return call;
  }

  /** Занг тамом шуд → сабт дар чат («📞 Занги аудио · 2:31», «Занги беҷавоб») ва 🔔 барои занги беҷавоб. */
  private async finish(call: CallWithPeople, status: CallStatus, viewerId: number): Promise<CallInfo> {
    const endedAt = new Date();
    // Танҳо як маротиба: агар ҳолат аллакай иваз шуда бошад, такрор намешавад.
    const { count } = await this.prisma.call.updateMany({ where: { id: call.id, status: call.status }, data: { status, endedAt } });
    const fresh = await this.prisma.call.findUniqueOrThrow({ where: { id: call.id }, include: people });
    if (!count) return toCall(fresh, viewerId);

    const icon = call.video ? '🎥' : '📞';
    const kind = call.video ? 'Занги видео' : 'Занги аудио';
    const sec = call.answeredAt ? Math.max(1, Math.round((endedAt.getTime() - call.answeredAt.getTime()) / 1000)) : 0;
    const text =
      status === 'ENDED' ? `${icon} ${kind} · ${fmt(sec)}` : status === 'DECLINED' ? `${icon} ${kind} — рад шуд` : `${icon} ${kind} — беҷавоб`;
    await this.prisma.message.create({
      data: { senderId: call.callerId, recipientId: call.calleeId, text, kind: 'CALL', durationSec: sec || null, readAt: status === 'ENDED' ? endedAt : null },
    });
    if (status === 'MISSED' || status === 'CANCELLED') {
      this.alerts.notify(call.calleeId, { icon: '📵', title: `Занги беҷавоб аз ${call.caller.fullName}`, body: kind, link: `/messages?to=${call.callerId}` });
    }
    this.events.emit([call.callerId, call.calleeId], 'calls');
    this.events.emit([call.callerId, call.calleeId], 'messages');
    return toCall(fresh, viewerId);
  }

  private async expireRinging() {
    const stale = await this.prisma.call.findMany({
      where: { status: 'RINGING', createdAt: { lt: new Date(Date.now() - CALL_RING_SECONDS * 1000) } },
      include: people,
    });
    for (const c of stale) await this.finish(c, 'MISSED', c.callerId);
  }
}

@Controller('calls')
@Feature('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post()
  start(@CurrentUser() user: AuthUser, @Body() dto: StartCallDto) {
    return this.calls.start(user, dto);
  }

  @Get('incoming')
  incoming(@CurrentUser() user: AuthUser) {
    return this.calls.incoming(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.calls.get(user, id);
  }

  @Post(':id/answer')
  @HttpCode(200)
  answer(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: AnswerCallDto) {
    return this.calls.answer(user, id, dto);
  }

  @Post(':id/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.calls.decline(user, id);
  }

  @Post(':id/end')
  @HttpCode(200)
  end(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.calls.end(user, id);
  }
}

@Module({
  controllers: [CallsController],
  providers: [CallsService],
})
export class CallsModule {}
