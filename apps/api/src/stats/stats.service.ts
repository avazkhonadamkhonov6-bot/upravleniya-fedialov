import { Injectable } from '@nestjs/common';
import { POSITIONS } from '@filialhub/shared';
import type {
  BranchRank,
  Overview,
  Period,
  PeriodStats,
  Position,
  ProductRank,
  TimePoint,
} from '@filialhub/shared';
import { localDateKey, periodStart, startOfLocalDay, startOfLocalMonth, startOfLocalWeek, TZ } from '../common/time';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type Granularity = 'day' | 'week' | 'month';

/** Як филиал ё ҳамаи филиалҳои ширкат (Prisma: branchId: 5 ё { in: [...] }) */
export type BranchScope = number | { in: number[] };

function ids(scope: BranchScope): number[] {
  return typeof scope === 'number' ? [scope] : scope.in;
}

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async periodStats(branchId: BranchScope, from: Date, to?: Date): Promise<PeriodStats> {
    const range = { gte: from, ...(to ? { lt: to } : {}) };
    const [agg, exp] = await Promise.all([
      this.prisma.order.aggregate({
        where: { branchId, createdAt: range },
        _sum: { total: true, totalCost: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({ where: { branchId, date: range }, _sum: { amount: true } }),
    ]);
    const revenue = Number(agg._sum.total ?? 0);
    const cost = Number(agg._sum.totalCost ?? 0);
    const expenses = Number(exp._sum.amount ?? 0);
    const orders = agg._count;
    return {
      revenue: round(revenue),
      cost: round(cost),
      profit: round(revenue - cost),
      expenses: round(expenses),
      netProfit: round(revenue - cost - expenses),
      orders,
      avgCheck: orders ? round(revenue / orders) : 0,
    };
  }

  async employeesByPosition(branchId: BranchScope): Promise<Record<Position, number>> {
    const rows = await this.prisma.user.groupBy({
      by: ['position'],
      where: { role: 'STAFF', isActive: true, branchId },
      _count: true,
    });
    const result = Object.fromEntries(POSITIONS.map((p) => [p, 0])) as Record<Position, number>;
    for (const r of rows) if (r.position) result[r.position] = r._count;
    return result;
  }

  async overview(branchId: BranchScope): Promise<Overview> {
    const today = startOfLocalDay();
    const [todayStats, yesterday, week, month, branches, byPosition, managers] = await Promise.all([
      this.periodStats(branchId, today),
      this.periodStats(branchId, startOfLocalDay(new Date(), -1), today),
      this.periodStats(branchId, startOfLocalWeek()),
      this.periodStats(branchId, startOfLocalMonth()),
      typeof branchId === 'number' ? Promise.resolve(1) : this.prisma.branch.count({ where: { isActive: true, id: branchId } }),
      this.employeesByPosition(branchId),
      this.prisma.user.count({ where: { role: 'MANAGER', isActive: true, branchId } }),
    ]);
    return {
      today: todayStats,
      yesterday,
      week,
      month,
      branches,
      employees: Object.values(byPosition).reduce((a, b) => a + b, 0),
      employeesByPosition: byPosition,
      managers,
    };
  }

  async timeseries(branchId: BranchScope, granularity: Granularity, points: number): Promise<TimePoint[]> {
    const keys = bucketKeys(granularity, points);
    const from = bucketStart(granularity, points);
    const rows = await this.prisma.$queryRaw<{ date: string; revenue: number; profit: number; orders: number }[]>(
      Prisma.sql`
        SELECT to_char(date_trunc(${granularity}, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS date,
               COALESCE(SUM("total"), 0)::float AS revenue,
               COALESCE(SUM("total" - "totalCost"), 0)::float AS profit,
               COUNT(*)::int AS orders
        FROM "Order"
        WHERE "createdAt" >= ${from}
          AND "branchId" = ANY(${ids(branchId)}::int[])
        GROUP BY 1
        ORDER BY 1`,
    );
    const map = new Map(rows.map((r) => [r.date, r]));
    return keys.map((date) => {
      const r = map.get(date);
      return { date, revenue: round(r?.revenue ?? 0), profit: round(r?.profit ?? 0), orders: r?.orders ?? 0 };
    });
  }

  async branchRanking(branchIds: number[], period: Period): Promise<BranchRank[]> {
    const from = periodStart(period);
    const [branches, sums, staff, exps] = await Promise.all([
      this.prisma.branch.findMany({ where: { isActive: true, id: { in: branchIds } }, orderBy: { id: 'asc' } }),
      this.prisma.order.groupBy({
        by: ['branchId'],
        where: { createdAt: { gte: from }, branchId: { in: branchIds } },
        _sum: { total: true, totalCost: true },
        _count: true,
      }),
      this.prisma.user.groupBy({ by: ['branchId'], where: { isActive: true, role: 'STAFF', branchId: { in: branchIds } }, _count: true }),
      this.prisma.expense.groupBy({ by: ['branchId'], where: { date: { gte: from }, branchId: { in: branchIds } }, _sum: { amount: true } }),
    ]);
    return branches
      .map((b) => {
        const s = sums.find((x) => x.branchId === b.id);
        const revenue = Number(s?._sum.total ?? 0);
        const cost = Number(s?._sum.totalCost ?? 0);
        const expenses = Number(exps.find((x) => x.branchId === b.id)?._sum.amount ?? 0);
        return {
          branchId: b.id,
          name: b.name,
          city: b.city,
          revenue: round(revenue),
          profit: round(revenue - cost),
          expenses: round(expenses),
          netProfit: round(revenue - cost - expenses),
          orders: s?._count ?? 0,
          employees: staff.find((x) => x.branchId === b.id)?._count ?? 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  async topProducts(branchId: BranchScope, period: Period, limit = 8): Promise<ProductRank[]> {
    const from = periodStart(period);
    const rows = await this.prisma.$queryRaw<ProductRank[]>(Prisma.sql`
      SELECT p.id AS "productId", p.name, p.emoji,
             SUM(oi.qty)::float AS qty,
             SUM(oi.qty * oi."unitPrice")::float AS revenue,
             SUM(oi.qty * (oi."unitPrice" - oi."unitCost"))::float AS profit
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      WHERE o."createdAt" >= ${from}
        AND o."branchId" = ANY(${ids(branchId)}::int[])
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT ${limit}`);
    return rows.map((r) => ({ ...r, revenue: round(r.revenue), profit: round(r.profit) }));
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function bucketStart(g: Granularity, points: number): Date {
  if (g === 'day') return startOfLocalDay(new Date(), -(points - 1));
  if (g === 'week') return new Date(startOfLocalWeek().getTime() - (points - 1) * 7 * DAY);
  const m = startOfLocalMonth();
  const local = new Date(m.getTime() + 5 * 60 * 60 * 1000);
  local.setUTCMonth(local.getUTCMonth() - (points - 1));
  return new Date(local.getTime() - 5 * 60 * 60 * 1000);
}

function bucketKeys(g: Granularity, points: number): string[] {
  const keys: string[] = [];
  if (g === 'month') {
    const start = new Date(bucketStart(g, points).getTime() + 5 * 60 * 60 * 1000);
    for (let i = 0; i < points; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
  }
  const step = g === 'week' ? 7 * DAY : DAY;
  const start = bucketStart(g, points).getTime();
  for (let i = 0; i < points; i++) keys.push(localDateKey(new Date(start + i * step)));
  return keys;
}
