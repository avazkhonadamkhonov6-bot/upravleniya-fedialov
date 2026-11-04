import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Injectable, Module, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { canSell, formatMoney, type CashReport, type ZReport } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { scopeBranch } from '../common/access';
import { localDay, startOfLocalDay } from '../common/time';
import { AlertsService } from '../core/alerts.service';
import { AuditService } from '../core/audit.service';
import { Prisma } from '../generated/prisma/client';
import { AiInsightsService } from '../notifications/ai-insights.service';
import { PrismaService } from '../prisma/prisma.service';

export class CloseCashDto {
  /** Пули ҳисобшудаи нақд дар касса */
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000)
  countedCash: number;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** «2026-10-31» → [оғози рӯз, рӯзи оянда) бо вақти Душанбе; холӣ — имрӯз */
export function dayRange(date?: string, now = new Date()): { key: string; from: Date; to: Date } {
  const key = date || localDay(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new BadRequestException('Сана нодуруст аст (YYYY-MM-DD)');
  const from = new Date(`${key}T00:00:00+05:00`);
  if (Number.isNaN(from.getTime()) || localDay(from) !== key) throw new BadRequestException('Сана нодуруст аст (YYYY-MM-DD)');
  if (from > now) throw new BadRequestException('Санаи оянда');
  return { key, from, to: startOfLocalDay(from, 1) };
}

type Sums = Omit<CashReport, 'userId' | 'userName' | 'branchName' | 'closing'>;
const empty = (): Sums => ({ orders: 0, cashSales: 0, cardSales: 0, debtSales: 0, discounts: 0, debtPaidCash: 0, debtPaidCard: 0, returns: 0, refundCash: 0, refundCard: 0, refundDebt: 0, expectedCash: 0 });
/** Сумма бо 2 рақам; шумораҳо (чек, возврат) — бутун */
const COUNTS = new Set(['orders', 'returns']);

/**
 * Z-ҳисобот ва пӯшидани касса: ҳар кассир дар охири рӯз мебинад, ки чӣ қадар нақд/корт/қарз фурӯхт ва
 * чӣ қадар пардохти қарз гирифт, пули кассаро ҳисоб карда менависад. Фарқ → 🔔 ба менеҷер (менеҷер → шеф).
 * Кассир — танҳо худаш; менеҷер — филиали худ; шеф — ҳама ё як филиал.
 */
@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly audit: AuditService,
    private readonly ai: AiInsightsService,
  ) {}

  async report(user: AuthUser, q: { date?: string; branchId?: number }): Promise<ZReport> {
    if (!canSell(user)) throw new ForbiddenException('Касса барои вазифаи шумо нест');
    const { key, from, to } = dayRange(q.date);
    const branch = scopeBranch(user, q.branchId);
    const branchIds = branch ? [branch] : user.branchIds;
    const onlyMe = user.role === 'STAFF' ? { userId: user.id } : {};
    const [sales, refunds, paid, closings] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['userId', 'payment'],
        where: { branchId: { in: branchIds }, createdAt: { gte: from, lt: to }, userId: { not: null }, returnOfId: null, ...onlyMe },
        _sum: { total: true, discount: true },
        _count: true,
      }),
      // Возвратҳо алоҳида: пули нақди баргашта аз касса мебарояд, корт — ба корти мизоҷ, қарз — қарзро кам мекунад
      this.prisma.order.groupBy({
        by: ['userId', 'payment'],
        where: { branchId: { in: branchIds }, createdAt: { gte: from, lt: to }, userId: { not: null }, returnOfId: { not: null }, ...onlyMe },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.debtEntry.groupBy({
        by: ['userId', 'payment'],
        // orderId: null — пардохти воқеии қарз; кам шудани қарз аз возврат (orderId-и возврат) пул ба касса намеорад
        where: { organizationId: user.organizationId, amount: { lt: 0 }, orderId: null, createdAt: { gte: from, lt: to }, userId: { not: null }, ...onlyMe, user: { branchId: { in: branchIds } } },
        _sum: { amount: true },
      }),
      this.prisma.cashClosing.findMany({ where: { branchId: { in: branchIds }, day: from, ...onlyMe } }),
    ]);
    const byUser = new Map<number, Sums>();
    const get = (id: number) => byUser.get(id) ?? byUser.set(id, empty()).get(id)!;
    for (const s of sales) {
      const r = get(s.userId!);
      const total = Number(s._sum.total ?? 0);
      r.orders += s._count;
      r.discounts += Number(s._sum.discount ?? 0);
      if (s.payment === 'CASH') r.cashSales += total;
      else if (s.payment === 'CARD') r.cardSales += total;
      else r.debtSales += total;
    }
    for (const s of refunds) {
      const r = get(s.userId!);
      const amount = -Number(s._sum.total ?? 0);
      r.returns += s._count;
      if (s.payment === 'CASH') r.refundCash += amount;
      else if (s.payment === 'CARD') r.refundCard += amount;
      else r.refundDebt += amount;
    }
    for (const p of paid) {
      const r = get(p.userId!);
      const amount = -Number(p._sum.amount ?? 0);
      if (p.payment === 'CARD') r.debtPaidCard += amount;
      else r.debtPaidCash += amount;
    }
    for (const c of closings) get(c.userId);
    const people = await this.prisma.user.findMany({ where: { id: { in: [...byUser.keys()] } }, select: { id: true, fullName: true, branch: { select: { name: true } } } });
    const rows: CashReport[] = [...byUser.entries()].map(([userId, s]) => {
      const c = closings.find((x) => x.userId === userId);
      const p = people.find((x) => x.id === userId);
      const rounded = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, COUNTS.has(k) ? v : r2(v)])) as Sums;
      return {
        userId,
        userName: p?.fullName ?? '—',
        branchName: p?.branch?.name ?? '',
        ...rounded,
        expectedCash: r2(s.cashSales + s.debtPaidCash - s.refundCash),
        closing: c ? { countedCash: Number(c.countedCash), diff: Number(c.diff), note: c.note, closedAt: c.updatedAt.toISOString() } : null,
      };
    });
    rows.sort((a, b) => b.cashSales + b.cardSales - (a.cashSales + a.cardSales));
    const t = (k: keyof Sums) => r2(rows.reduce((s, r) => s + r[k], 0));
    return {
      date: key,
      rows,
      totals: {
        orders: t('orders'),
        cashSales: t('cashSales'),
        cardSales: t('cardSales'),
        debtSales: t('debtSales'),
        debtPaidCash: t('debtPaidCash'),
        debtPaidCard: t('debtPaidCard'),
        returns: t('returns'),
        refundCash: t('refundCash'),
        refundCard: t('refundCard'),
        refundDebt: t('refundDebt'),
        expectedCash: t('expectedCash'),
        diff: r2(rows.reduce((s, r) => s + (r.closing?.diff ?? 0), 0)),
      },
    };
  }

  /** Кассаи имрӯзаи худро пӯшидан (дубора — навсозӣ); фарқ ҳатман ба менеҷер ё шеф хабар дода мешавад */
  async close(user: AuthUser, dto: CloseCashDto) {
    if (!canSell(user)) throw new ForbiddenException('Касса барои вазифаи шумо нест');
    if (!user.branchId) throw new BadRequestException('Кассаро корманди филиал мепӯшад (шеф филиал надорад)');
    const { from } = dayRange();
    const z = await this.report({ ...user, role: 'STAFF' }, {});
    const me = z.rows.find((r) => r.userId === user.id) ?? { ...empty(), expectedCash: 0 };
    const counted = r2(dto.countedCash);
    const diff = r2(counted - me.expectedCash);
    const data = {
      organizationId: user.organizationId,
      branchId: user.branchId,
      userId: user.id,
      day: from,
      orders: me.orders,
      cashSales: me.cashSales,
      cardSales: me.cardSales,
      debtSales: me.debtSales,
      debtPaidCash: me.debtPaidCash,
      debtPaidCard: me.debtPaidCard,
      expectedCash: me.expectedCash,
      countedCash: counted,
      diff,
      note: dto.note?.trim() ?? '',
    };
    await this.prisma.cashClosing.upsert({ where: { userId_day: { userId: user.id, day: from } }, create: data, update: data });
    this.audit.log(user, 'UPDATE', 'cash', null, `Касса пӯшида шуд: интизор ${formatMoney(me.expectedCash)}, ҳисоб ${formatMoney(counted)}, фарқ ${formatMoney(diff)}`, user.branchId);
    await this.tellBoss(user, {
      icon: diff === 0 ? '✅' : '⚠️',
      title: diff === 0 ? `${user.fullName} кассаро пӯшид — бе фарқ` : `${user.fullName}: фарқи касса ${diff > 0 ? '+' : ''}${formatMoney(diff)}`,
      body: `Нақд: интизор ${formatMoney(me.expectedCash)}, ҳисоб ${formatMoney(counted)} · корт ${formatMoney(me.cardSales + me.debtPaidCard)} · қарз ${formatMoney(me.debtSales)}${me.returns ? ` · возврат ${me.returns} (нақд −${formatMoney(me.refundCash)})` : ''}${dto.note?.trim() ? ` · ${dto.note.trim()}` : ''}`,
      link: '/sales',
    });
    // Санҷиши шубҳанок дар замина — кассир интизор намешавад
    void this.ai
      .auditCashClosing({ organizationId: user.organizationId, userId: user.id, fullName: user.fullName, day: from, today: { ...me, diff, note: data.note } })
      .then((text) => text ? this.tellBoss(user, { icon: '🕵️', title: `Санҷиши касса: ${user.fullName}`, body: text, link: '/sales' }) : undefined);
    return (await this.report({ ...user, role: 'STAFF' }, {})).rows.find((r) => r.userId === user.id)!;
  }

  /** Корманд → менеҷерони филиал (набошанд — шеф); менеҷер → шеф */
  private async tellBoss(user: AuthUser, alert: { icon: string; title: string; body: string; link: string }) {
    const base: Prisma.UserWhereInput = { organizationId: user.organizationId, isActive: true, id: { not: user.id } };
    let bosses = user.role === 'STAFF' ? await this.prisma.user.findMany({ where: { ...base, role: 'MANAGER', branchId: user.branchId }, select: { id: true } }) : [];
    if (!bosses.length) bosses = await this.prisma.user.findMany({ where: { ...base, role: 'CHEF' }, select: { id: true } });
    this.alerts.notify(bosses.map((b) => b.id), alert);
  }
}

@Controller('cash')
@Feature('sales')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('z')
  report(@CurrentUser() user: AuthUser, @Query('date') date?: string, @Query('branchId') branchId?: string) {
    return this.cash.report(user, { date, branchId: Number(branchId) || undefined });
  }

  @Post('close')
  @HttpCode(200)
  close(@CurrentUser() user: AuthUser, @Body() dto: CloseCashDto) {
    return this.cash.close(user, dto);
  }
}

@Module({
  controllers: [CashController],
  providers: [CashService],
})
export class CashModule {}
