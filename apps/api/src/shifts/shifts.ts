import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { LATE_MINUTES, type AttendanceSummary, type Shift as ShiftDto, type ShiftState } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { branchWhere, scopeBranch } from '../common/access';
import { localDateKey, startOfLocalDay, startOfLocalWeek } from '../common/time';
import { AlertInput, AlertsService } from '../core/alerts.service';
import { AuditService } from '../core/audit.service';
import { Prisma } from '../generated/prisma/client';
import { ChatService } from '../notifications/chat.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86400000;
/** Ба сменае, ки то 8 соат баъд сар мешавад, «Омадам» қабул мешавад — корманд метавонад барвақт ояд. */
const EARLY_CHECKIN_MS = 8 * 3600000;
/** Ҷадвал нест — «Омадам» сменаи 8-соатаро худаш мекушояд (вақти омад ҳамеша сабт мешавад) */
const AD_HOC_MS = 8 * 3600000;
/** Барвақт рафтан аз ин зиёд — дар хабар гуфта мешавад */
const EARLY_LEAVE_MINUTES = 10;

/** Паёми ихтиёрӣ ҳангоми «Омадам / Рафтам» (масалан «барвақт омадам») — ба менеҷер ё шеф */
export class CheckDto {
  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class CreateShiftDto {
  @Type(() => Number) @IsInt()
  userId: number;

  @IsDateString({}, { message: 'Вақти оғоз нодуруст аст' })
  startsAt: string;

  @IsDateString({}, { message: 'Вақти анҷом нодуруст аст' })
  endsAt: string;
}

export class UpdateShiftDto {
  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsDateString()
  endsAt?: string;
}

export class CopyWeekDto {
  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  /** Душанбеи ҳафтае, ки ба он нусха бардошта мешавад */
  @IsDateString()
  weekStart: string;
}

const include = {
  user: { select: { fullName: true, position: true, role: true } },
  branch: { select: { name: true } },
} satisfies Prisma.ShiftInclude;
type ShiftRow = Prisma.ShiftGetPayload<{ include: typeof include }>;

export function shiftState(s: Pick<ShiftRow, 'startsAt' | 'endsAt' | 'checkInAt' | 'checkOutAt'>, now = new Date()) {
  const lateAt = s.startsAt.getTime() + LATE_MINUTES * 60000;
  let state: ShiftState;
  if (s.checkOutAt) state = 'DONE';
  else if (s.checkInAt) state = 'ON_SHIFT';
  else if (now.getTime() > s.endsAt.getTime()) state = 'ABSENT';
  else if (now.getTime() > lateAt) state = 'LATE';
  else state = 'PLANNED';
  // Дер омадан: аз рӯи вақти омад; агар ҳоло наомада бошад (LATE) — то ҳозир. Наомадан (ABSENT) дер ҳисоб намешавад.
  const ref = s.checkInAt ?? (state === 'LATE' ? now : null);
  const late = ref ? Math.max(0, Math.round((Math.min(ref.getTime(), s.endsAt.getTime()) - s.startsAt.getTime()) / 60000)) : 0;
  return { state, lateMinutes: late > LATE_MINUTES ? late : 0 };
}

function toShift(s: ShiftRow): ShiftDto {
  const { state, lateMinutes } = shiftState(s);
  const end = s.checkOutAt ?? (s.checkInAt ? new Date(Math.min(Date.now(), s.endsAt.getTime())) : null);
  return {
    id: s.id,
    userId: s.userId,
    userName: s.user.fullName,
    position: s.user.position,
    role: s.user.role,
    branchId: s.branchId,
    branchName: s.branch.name,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    checkInAt: s.checkInAt?.toISOString() ?? null,
    checkOutAt: s.checkOutAt?.toISOString() ?? null,
    lateMinutes,
    earlyMinutes: s.checkInAt && s.checkInAt < s.startsAt ? Math.round((s.startsAt.getTime() - s.checkInAt.getTime()) / 60000) : 0,
    hoursWorked: s.checkInAt && end ? Math.max(0, Math.round(((end.getTime() - s.checkInAt.getTime()) / 3600000) * 10) / 10) : 0,
    state,
  };
}

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
    private readonly chat: ChatService,
  ) {}

  async list(user: AuthUser, q: { branchId?: number; from?: string; to?: string }) {
    const from = q.from ? new Date(q.from) : startOfLocalWeek();
    const to = q.to ? new Date(q.to) : new Date(from.getTime() + 7 * DAY);
    const rows = await this.prisma.shift.findMany({
      where: {
        startsAt: { gte: from, lt: to },
        ...(user.role === 'STAFF' ? { userId: user.id } : { branchId: branchWhere(user, q.branchId) }),
      },
      include,
      orderBy: [{ startsAt: 'asc' }],
    });
    return rows.map(toShift);
  }

  /** Давомоти имрӯз: кӣ омад, кӣ дер монд, кӣ наомад. */
  async today(user: AuthUser, branchId?: number): Promise<{ summary: AttendanceSummary; shifts: ShiftDto[] }> {
    const from = startOfLocalDay();
    const shifts = await this.list(user, { branchId, from: from.toISOString(), to: new Date(from.getTime() + DAY).toISOString() });
    const count = (s: ShiftState) => shifts.filter((x) => x.state === s).length;
    return {
      summary: {
        date: localDateKey(from),
        planned: shifts.length,
        onShift: count('ON_SHIFT'),
        late: shifts.filter((s) => s.lateMinutes > 0 || s.state === 'LATE').length,
        absent: count('ABSENT'),
        done: count('DONE'),
      },
      shifts,
    };
  }

  async create(user: AuthUser, dto: CreateShiftDto) {
    const worker = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!worker || !worker.isActive || !worker.branchId) throw new BadRequestException('Корманд ёфт нашуд');
    scopeBranch(user, worker.branchId);
    const { startsAt, endsAt } = this.validateTimes(dto.startsAt, dto.endsAt);
    await this.ensureNoOverlap(worker.id, startsAt, endsAt);
    const s = await this.prisma.shift.create({
      data: { userId: worker.id, branchId: worker.branchId, startsAt, endsAt },
      include,
    });
    this.audit.log(user, 'CREATE', 'shift', s.id, `Смена: ${worker.fullName}, ${fmt(startsAt)}–${fmtTime(endsAt)}`, s.branchId);
    if (worker.id !== user.id) {
      this.alerts.notify(worker.id, { icon: '🗓', title: 'Сменаи нав', body: `${fmt(startsAt)} – ${fmtTime(endsAt)}`, link: '/schedule' });
    }
    return toShift(s);
  }

  async update(user: AuthUser, id: number, dto: UpdateShiftDto) {
    const s = await this.ensure(user, id);
    const { startsAt, endsAt } = this.validateTimes(dto.startsAt ?? s.startsAt.toISOString(), dto.endsAt ?? s.endsAt.toISOString());
    await this.ensureNoOverlap(s.userId, startsAt, endsAt, id);
    const updated = await this.prisma.shift.update({ where: { id }, data: { startsAt, endsAt }, include });
    this.audit.log(user, 'UPDATE', 'shift', id, `Смена тағйир ёфт: ${updated.user.fullName}, ${fmt(startsAt)}`, s.branchId);
    return toShift(updated);
  }

  async remove(user: AuthUser, id: number) {
    const s = await this.ensure(user, id);
    await this.prisma.shift.delete({ where: { id } });
    this.audit.log(user, 'DELETE', 'shift', id, `Смена нест шуд: ${s.user.fullName}, ${fmt(s.startsAt)}`, s.branchId);
    return { ok: true };
  }

  /** Ҷадвали ҳафтаи гузаштаро ба ҳафтаи интихобшуда нусха мебардорад (сменаҳои мавҷуда такрор намешаванд). */
  async copyWeek(user: AuthUser, dto: CopyWeekDto) {
    const branchId = scopeBranch(user, dto.branchId);
    if (!branchId) throw new BadRequestException('Филиалро интихоб кунед');
    const target = new Date(dto.weekStart);
    const source = new Date(target.getTime() - 7 * DAY);
    const [prev, existing] = await Promise.all([
      this.prisma.shift.findMany({ where: { branchId, startsAt: { gte: source, lt: target } }, include: { user: true } }),
      this.prisma.shift.findMany({ where: { branchId, startsAt: { gte: target, lt: new Date(target.getTime() + 7 * DAY) } } }),
    ]);
    const data = prev
      .filter((s) => s.user.isActive)
      .map((s) => ({ userId: s.userId, branchId, startsAt: new Date(s.startsAt.getTime() + 7 * DAY), endsAt: new Date(s.endsAt.getTime() + 7 * DAY) }))
      .filter((n) => !existing.some((e) => e.userId === n.userId && e.startsAt < n.endsAt && e.endsAt > n.startsAt));
    if (data.length) await this.prisma.shift.createMany({ data });
    this.audit.log(user, 'CREATE', 'shift', null, `Ҷадвали ҳафта нусха шуд: ${data.length} смена`, branchId);
    return { created: data.length };
  }

  /**
   * «Омадам»: вақти омад сабт мешавад. Агар ҷадвал набошад — сменаи 8-соата худкор кушода мешавад.
   * Хабар бо вақт ва «барвақт / дер» ба менеҷери филиал меравад (аз менеҷер — ба шеф); паёми ихтиёрӣ ба чат.
   */
  async checkIn(user: AuthUser, dto: CheckDto = {}) {
    const now = new Date();
    const open = await this.prisma.shift.findFirst({ where: { userId: user.id, checkInAt: { not: null }, checkOutAt: null } });
    if (open) throw new BadRequestException('Шумо аллакай дар кор ҳастед — аввал «Рафтам»-ро пахш кунед');
    let s = await this.prisma.shift.findFirst({
      where: { userId: user.id, checkInAt: null, startsAt: { lte: new Date(now.getTime() + EARLY_CHECKIN_MS) }, endsAt: { gt: now } },
      include,
      orderBy: { startsAt: 'asc' },
    });
    let updated: ShiftRow;
    // Барвақт «Рафтам» пахш карда буд ва баргашт — ҳамон смена боз мешавад (вақти омади аввал мемонад)
    const back = s ? null : await this.prisma.shift.findFirst({ where: { userId: user.id, checkOutAt: { not: null }, startsAt: { lte: now }, endsAt: { gt: now } } });
    if (s) {
      updated = await this.prisma.shift.update({ where: { id: s.id }, data: { checkInAt: now }, include });
    } else if (back) {
      updated = await this.prisma.shift.update({ where: { id: back.id }, data: { checkOutAt: null }, include });
    } else {
      if (!user.branchId) throw new BadRequestException('Шумо ба ягон филиал вобаста нестед');
      const next = await this.prisma.shift.findFirst({ where: { userId: user.id, startsAt: { gt: now } }, orderBy: { startsAt: 'asc' } });
      const endsAt = new Date(Math.min(now.getTime() + AD_HOC_MS, next ? next.startsAt.getTime() : Infinity));
      await this.ensureNoOverlap(user.id, now, endsAt);
      updated = await this.prisma.shift.create({ data: { userId: user.id, branchId: user.branchId, startsAt: now, endsAt, checkInAt: now }, include });
    }
    const dto2 = toShift(updated);
    const scheduled = !!s;
    const when = dto2.lateMinutes > 0 ? `${dto2.lateMinutes} дақ дер` : dto2.earlyMinutes > 0 ? `${dto2.earlyMinutes} дақ барвақт` : scheduled ? 'сари вақт' : 'бе ҷадвал';
    const shiftText = scheduled ? `смена ${fmtTime(updated.startsAt)}–${fmtTime(updated.endsAt)}` : '';
    await this.tellBoss(user, dto.note, {
      icon: dto2.lateMinutes > 0 ? '⏰' : '✅',
      title: `${user.fullName} омад — ${fmtTime(now)}`,
      body: [shiftText, when].filter(Boolean).join(' · '),
      link: '/schedule',
    });
    return dto2;
  }

  /** «Рафтам»: вақти рафтан ва соатҳои кор; хабар ба менеҷер (ё шеф) */
  async checkOut(user: AuthUser, dto: CheckDto = {}) {
    const s = await this.prisma.shift.findFirst({
      where: { userId: user.id, checkInAt: { not: null }, checkOutAt: null },
      orderBy: { startsAt: 'desc' },
    });
    if (!s) throw new BadRequestException('Шумо ҳоло дар смена нестед');
    const now = new Date();
    const updated = toShift(await this.prisma.shift.update({ where: { id: s.id }, data: { checkOutAt: now }, include }));
    const earlyLeave = Math.round((s.endsAt.getTime() - now.getTime()) / 60000);
    await this.tellBoss(user, dto.note, {
      icon: '👋',
      title: `${user.fullName} рафт — ${fmtTime(now)}`,
      body: [`${updated.hoursWorked} соат кор кард`, earlyLeave > EARLY_LEAVE_MINUTES ? `${earlyLeave} дақ барвақт рафт` : ''].filter(Boolean).join(' · '),
      link: '/schedule',
    });
    return updated;
  }

  /**
   * Ба кӣ хабар меравад: корманд → менеҷерони филиал (агар набошанд — шеф); менеҷер → шеф.
   * Бо паём — паёми чат (ҷавоб додан мумкин; 🔔 худаш меояд), бе паём — танҳо 🔔.
   */
  private async tellBoss(user: AuthUser, note: string | undefined, alert: AlertInput) {
    const base = { organizationId: user.organizationId, isActive: true, id: { not: user.id } };
    let bosses = user.role === 'STAFF' && user.branchId ? await this.prisma.user.findMany({ where: { ...base, role: 'MANAGER', branchId: user.branchId } }) : [];
    if (!bosses.length) bosses = await this.prisma.user.findMany({ where: { ...base, role: 'CHEF' } });
    const text = note?.trim();
    if (!text) {
      this.alerts.notify(bosses.map((b) => b.id), alert);
      return bosses.length;
    }
    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    for (const b of bosses) await this.chat.deliver(sender, b, `${alert.icon} ${alert.title}${alert.body ? ` (${alert.body})` : ''}
${text}`, []);
    return bosses.length;
  }

  /** Сменаи ҷорӣ ё навбатии худи корбар (барои тугмаи «Омадам»). */
  async mine(user: AuthUser) {
    const now = new Date();
    const s = await this.prisma.shift.findFirst({
      where: { userId: user.id, endsAt: { gt: new Date(now.getTime() - 12 * 3600000) }, checkOutAt: null },
      include,
      orderBy: { startsAt: 'asc' },
    });
    return s ? toShift(s) : null;
  }

  private async ensure(user: AuthUser, id: number) {
    const s = await this.prisma.shift.findUnique({ where: { id }, include: { user: true } });
    if (!s) throw new NotFoundException('Смена ёфт нашуд');
    scopeBranch(user, s.branchId);
    return s;
  }

  private validateTimes(a: string, b: string) {
    const startsAt = new Date(a);
    const endsAt = new Date(b);
    if (endsAt <= startsAt) throw new BadRequestException('Вақти анҷом бояд баъд аз оғоз бошад');
    if (endsAt.getTime() - startsAt.getTime() > 16 * 3600000) throw new BadRequestException('Смена зиёда аз 16 соат буда наметавонад');
    return { startsAt, endsAt };
  }

  private async ensureNoOverlap(userId: number, startsAt: Date, endsAt: Date, exceptId?: number) {
    const clash = await this.prisma.shift.findFirst({
      where: { userId, id: exceptId ? { not: exceptId } : undefined, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    });
    if (clash) throw new BadRequestException('Дар ин вақт корманд аллакай смена дорад');
  }
}

const TZ_MS = 5 * 3600000;
function fmtTime(d: Date) {
  return new Date(d.getTime() + TZ_MS).toISOString().slice(11, 16);
}
function fmt(d: Date) {
  const l = new Date(d.getTime() + TZ_MS);
  return `${l.toISOString().slice(8, 10)}.${l.toISOString().slice(5, 7)} ${fmtTime(d)}`;
}

@Controller('shifts')
@Feature('schedule')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.shifts.list(user, { branchId: Number(branchId) || undefined, from, to });
  }

  @Get('today')
  @Roles('CHEF', 'MANAGER')
  today(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.shifts.today(user, Number(branchId) || undefined);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.shifts.mine(user);
  }

  @Post()
  @Roles('CHEF', 'MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShiftDto) {
    return this.shifts.create(user, dto);
  }

  @Post('copy-week')
  @Roles('CHEF', 'MANAGER')
  @HttpCode(200)
  copyWeek(@CurrentUser() user: AuthUser, @Body() dto: CopyWeekDto) {
    return this.shifts.copyWeek(user, dto);
  }

  @Post('check-in')
  @HttpCode(200)
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: CheckDto) {
    if (user.role === 'CHEF') throw new ForbiddenException('Шеф смена надорад');
    return this.shifts.checkIn(user, dto);
  }

  @Post('check-out')
  @HttpCode(200)
  checkOut(@CurrentUser() user: AuthUser, @Body() dto: CheckDto) {
    return this.shifts.checkOut(user, dto);
  }

  @Patch(':id')
  @Roles('CHEF', 'MANAGER')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShiftDto) {
    return this.shifts.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('CHEF', 'MANAGER')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.shifts.remove(user, id);
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
})
export class ShiftsModule {}
