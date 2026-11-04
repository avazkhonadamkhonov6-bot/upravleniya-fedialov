import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEMO_EMAILS } from '../auth/demo-guard';
import { localDay, TZ } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

/** Кӣ ба ширкат тааллуқ дорад: бевосита, тавассути филиал ё тавассути корбар */
type Scope = 'org' | 'branch' | { user: string };

/**
 * Ҷадвалҳо ва санаҳое, ки бо ҳам кӯчонида мешаванд. Номҳо аз код аст (на аз корбар) — SQL-и хом бехатар.
 * CashClosing намекӯчад: (userId, day) unique аст ва кӯчонидан метавонад бо Z-ҳисоботи нав бархӯрад.
 */
const TABLES: { table: string; cols: string[]; scope: Scope }[] = [
  { table: 'Order', cols: ['createdAt'], scope: 'branch' },
  { table: 'Expense', cols: ['date', 'createdAt'], scope: 'branch' },
  { table: 'Shift', cols: ['startsAt', 'endsAt', 'checkInAt', 'checkOutAt', 'createdAt'], scope: 'branch' },
  { table: 'Customer', cols: ['birthday', 'lastVisitAt', 'debtDueAt', 'debtRemindedAt', 'createdAt'], scope: 'org' },
  { table: 'Task', cols: ['dueDate', 'completedAt', 'createdAt'], scope: 'org' },
  { table: 'DebtEntry', cols: ['dueAt', 'createdAt'], scope: 'org' },
  { table: 'DebtRequest', cols: ['dueAt', 'decidedAt', 'createdAt'], scope: 'org' },
  { table: 'PromoCode', cols: ['startsAt', 'endsAt', 'createdAt'], scope: 'org' },
  { table: 'OnlineOrder', cols: ['createdAt', 'updatedAt'], scope: 'org' },
  { table: 'Review', cols: ['createdAt'], scope: 'org' },
  { table: 'StockMove', cols: ['createdAt'], scope: 'org' },
  { table: 'AuditLog', cols: ['createdAt'], scope: 'org' },
  { table: 'Notification', cols: ['createdAt'], scope: 'org' },
  { table: 'Alert', cols: ['readAt', 'createdAt'], scope: { user: 'userId' } },
  { table: 'Message', cols: ['readAt', 'createdAt'], scope: { user: 'senderId' } },
  { table: 'Call', cols: ['answeredAt', 'endedAt', 'createdAt'], scope: { user: 'callerId' } },
];

/** Чанд рӯз аз санаи охирини кӯчонидан («2026-10-01») то имрӯз гузашт */
export function demoShiftDays(anchorDay: string, now = new Date()): number {
  return Math.max(0, Math.round((Date.parse(localDay(now)) - Date.parse(anchorDay)) / DAY_MS));
}

export function demoShiftSql(t: (typeof TABLES)[number]): string {
  const set = t.cols.map((c) => `"${c}" = "${c}" + make_interval(days => $1)`).join(', ');
  const owner =
    t.scope === 'org'
      ? `"organizationId" = $3`
      : t.scope === 'branch'
        ? `"branchId" IN (SELECT id FROM "Branch" WHERE "organizationId" = $3)`
        : `"${t.scope.user}" IN (SELECT id FROM "User" WHERE "organizationId" = $3)`;
  return `UPDATE "${t.table}" SET ${set} WHERE ${owner} AND "createdAt" <= $2`;
}

/**
 * Демо зинда мемонад: маълумоти намунавӣ як бор сохта шуда буд ва бо гузашти вақт «Имрӯз 0 сомонӣ»,
 * «27 вазифа мӯҳлаташ гузашт» нишон медод. Ҳар шаб ва ҳангоми сар шудани сервер ҳамаи санаҳои ширкатҳои демо
 * ба андозаи рӯзҳои гузашта пеш мекӯчанд. Сабте, ки пас аз кӯчонидан дар оянда мемонд (масалан фурӯши дирӯзаи
 * меҳмон), намекӯчад — ҳеҷ фурӯш ба оянда намеравад.
 */
@Injectable()
export class DemoRefresh implements OnApplicationBootstrap {
  private readonly logger = new Logger('Demo');

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.run().catch((e: unknown) => this.logger.warn(`Демо нав нашуд: ${e instanceof Error ? e.message : e}`));
  }

  @Cron('0 5 0 * * *', { name: 'demo-refresh', timeZone: TZ })
  async run(now = new Date()) {
    const orgs = await this.prisma.organization.findMany({
      where: { users: { some: { email: { in: DEMO_EMAILS } } } },
      select: { id: true, name: true, createdAt: true },
    });
    for (const org of orgs) {
      const key = `demo-refresh:${org.id}`;
      const saved = await this.prisma.appSetting.findUnique({ where: { key } });
      // Бори аввал: маълумот ҳамон рӯзе сохта шуд, ки ширкат (seed)
      const days = demoShiftDays(saved?.value ?? localDay(org.createdAt), now);
      if (!days) continue;
      const cutoff = new Date(now.getTime() - days * DAY_MS);
      await this.prisma.$transaction([
        ...TABLES.map((t) => this.prisma.$executeRawUnsafe(demoShiftSql(t), days, cutoff, org.id)),
        this.prisma.$executeRaw`UPDATE "StoreView" SET "day" = "day" + ${days}::int WHERE "organizationId" = ${org.id} AND "day" <= ${cutoff}::date`,
        this.prisma.appSetting.upsert({ where: { key }, create: { key, value: localDay(now) }, update: { value: localDay(now) } }),
      ]);
      this.logger.log(`Демо «${org.name}»: санаҳо ${days} рӯз пеш кӯчонида шуданд`);
    }
  }
}
