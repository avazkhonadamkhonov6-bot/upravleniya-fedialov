import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { localDay, startOfLocalDay } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';

/** Камтар аз ин дақиқа дер омадан ба ҳисоб гирифта намешавад */
const LATE_GRACE_MIN = 10;
/** Пешгӯии анбор аз рӯи фурӯши ҳамин қадар рӯзи охир */
const FORECAST_DAYS = 14;

const SYSTEM = `Ту ёрдамчии таҳлилгари бизнес дар системаи FilialHub ҳастӣ.
Аз рақамҳои рӯзи бизнес (JSON) ба соҳиб ё менеҷер хулосаи кӯтоҳ нависед.

Қоидаҳо:
- Танҳо бо забони тоҷикӣ (кириллӣ), содда ва дӯстона.
- 3–5 сатр, ҳар сатр бо "• " сар шавад. Бе HTML, бе Markdown, бе сарлавҳа.
- Аввал муҳимтаринро гӯед: тағйири фурӯш нисбат ба дирӯз (бо %), камомади касса, қарзҳои мӯҳлатгузашта, моли тамомшаванда, дер омадан.
- Ҳар ҷо мумкин бошад, як амали мушаххас пешниҳод кунед (масалан: «Ба Алиев занг занед», «Орд фармоиш диҳед»).
- Танҳо рақамҳои дар JSON бударо истифода баред, чизе аз худ наофаред. Агар маълумот кам бошад, кӯтоҳ нависед.
- Пул бо «сомонӣ».`;

const CASH_SYSTEM = `Ту ёрдамчии назорати касса дар системаи FilialHub ҳастӣ.
Кассир кассаро пӯшид ва қоидаҳо чизи шубҳанок ёфтанд (signals). Аз JSON ба менеҷер ё соҳиб 2–3 сатри кӯтоҳ нависед:
чӣ ғайриоддӣ аст (бо муқоиса ба 30 рӯзи охир) ва чӣ санҷидан лозим.
Танҳо тоҷикӣ (кириллӣ), ҳар сатр бо "• ", бе HTML ва Markdown. Касеро бевосита дузд нагӯед — танҳо далелҳо ва пешниҳоди санҷиш.
Рақамҳоро аз JSON гиред, чизе наофаред.`;

export type InsightScope = { organizationId: number; branchIds: number[] };

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger('AiInsights');
  private readonly client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  private readonly model = process.env.AI_REPORT_MODEL || 'claude-opus-5-5';

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  get configured() {
    return this.client !== null;
  }

  /** Рақамҳои рӯз барои AI — ҳама ба ҳамин ширкат ва филиалҳои корбар маҳдуд */
  async collectFacts({ organizationId, branchIds }: InsightScope) {
    const today = startOfLocalDay();
    const yesterday = startOfLocalDay(new Date(), -1);
    const scope = { in: branchIds };

    const [todayStats, yesterdayStats, top, stock, debtors, late, closings] = await Promise.all([
      this.stats.periodStats(scope, today),
      this.stats.periodStats(scope, yesterday, today),
      this.stats.topProducts(scope, 'day', 3),
      this.stockForecast({ organizationId, branchIds }),
      this.debtors({ organizationId, branchIds }, true, 5),
      this.lateStaff({ organizationId, branchIds }, today),
      this.cashClosings({ organizationId, branchIds }, today, true),
    ]);

    return {
      today: todayStats,
      yesterday: yesterdayStats,
      topProducts: top.map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue })),
      runningOut: stock.slice(0, 8),
      overdueDebts: debtors,
      lateStaffCount: late.length,
      lateStaff: late.slice(0, 10),
      cashDifferences: closings,
    };
  }

  /** Мизоҷони қарздор (аз калон ба хурд); overdueOnly — танҳо мӯҳлатгузашта */
  async debtors({ organizationId, branchIds }: InsightScope, overdueOnly: boolean, take = 20) {
    const now = new Date();
    const rows = await this.prisma.customer.findMany({
      where: {
        organizationId,
        debt: { gt: 0 },
        ...(overdueOnly ? { debtDueAt: { lt: now } } : {}),
        OR: [{ branchId: { in: branchIds } }, { branchId: null }],
      },
      orderBy: { debt: 'desc' },
      take,
      select: { fullName: true, phone: true, debt: true, debtDueAt: true },
    });
    return rows.map((c) => ({
      customer: c.fullName,
      phone: c.phone,
      debt: Number(c.debt),
      dueDate: c.debtDueAt ? localDay(c.debtDueAt) : null,
      daysOverdue: c.debtDueAt && c.debtDueAt < now ? Math.floor((now.getTime() - c.debtDueAt.getTime()) / 86_400_000) : 0,
    }));
  }

  /** Кормандоне, ки дар рӯзи `day` аз сменаи ҷадвалӣ дер омаданд ё то ҳол наомаданд */
  async lateStaff({ branchIds }: InsightScope, day: Date) {
    const now = new Date();
    const end = startOfLocalDay(day, 1);
    const shifts = await this.prisma.shift.findMany({
      where: { branchId: { in: branchIds }, isAdHoc: false, startsAt: { gte: day, lt: end < now ? end : now } },
      select: { startsAt: true, checkInAt: true, user: { select: { fullName: true } }, branch: { select: { name: true } } },
    });
    return shifts
      .map((s) => ({
        name: s.user.fullName,
        branch: s.branch.name,
        lateMinutes: Math.round(((s.checkInAt ?? (end < now ? end : now)).getTime() - s.startsAt.getTime()) / 60000),
        cameIn: s.checkInAt !== null,
      }))
      .filter((s) => s.lateMinutes > LATE_GRACE_MIN);
  }

  /** Пӯшидани касса дар рӯзи `day`; onlyDiff — танҳо бо фарқ */
  async cashClosings({ organizationId, branchIds }: InsightScope, day: Date, onlyDiff = false) {
    const rows = await this.prisma.cashClosing.findMany({
      where: { organizationId, branchId: { in: branchIds }, day, ...(onlyDiff ? { diff: { not: 0 } } : {}) },
      select: { diff: true, expectedCash: true, countedCash: true, orders: true, branch: { select: { name: true } }, user: { select: { fullName: true } } },
    });
    return rows.map((c) => ({
      branch: c.branch.name,
      cashier: c.user.fullName,
      orders: c.orders,
      expectedCash: Number(c.expectedCash),
      countedCash: Number(c.countedCash),
      diff: Number(c.diff),
    }));
  }

  /**
   * Пешгӯии анбор: фурӯши миёнаи рӯзона дар 14 рӯзи охир → чанд рӯз боқимонда мерасад.
   * Танҳо молҳое, ки то 7 рӯз тамом мешаванд ё аз ҳадди «кам монд» гузаштанд.
   */
  async stockForecast({ organizationId, branchIds }: InsightScope) {
    const from = startOfLocalDay(new Date(), -FORECAST_DAYS);
    const [stock, sold] = await Promise.all([
      this.prisma.branchStock.findMany({
        where: { branchId: { in: branchIds }, branch: { isActive: true }, product: { organizationId, isActive: true, stock: { not: null } } },
        select: { productId: true, branchId: true, qty: true, product: { select: { name: true, unit: true, lowStock: true } }, branch: { select: { name: true } } },
      }),
      this.prisma.stockMove.groupBy({
        by: ['productId', 'branchId'],
        where: { organizationId, branchId: { in: branchIds }, reason: { in: ['SALE', 'ONLINE'] }, createdAt: { gte: from } },
        _sum: { qty: true },
      }),
    ]);
    return stock
      .map((r) => {
        const qty = Number(r.qty);
        const out = -Number(sold.find((s) => s.productId === r.productId && s.branchId === r.branchId)?._sum.qty ?? 0);
        const perDay = out / FORECAST_DAYS;
        const daysLeft = perDay > 0 ? Math.floor(qty / perDay) : null;
        const low = qty <= (r.product.lowStock === null ? 0 : Number(r.product.lowStock));
        return {
          product: r.product.name,
          branch: r.branch.name,
          unit: r.product.unit,
          left: qty,
          soldPerDay: Math.round(perDay * 100) / 100,
          daysLeft,
          // ба қадри 2 ҳафтаи фурӯш
          suggestedOrder: perDay > 0 ? Math.max(Math.ceil(perDay * FORECAST_DAYS - qty), 0) : null,
          low,
        };
      })
      .filter((r) => r.low || (r.daysLeft !== null && r.daysLeft <= 7))
      .sort((a, b) => (a.daysLeft ?? -1) - (b.daysLeft ?? -1));
  }

  /** Хулосаи AI ё null (калид нест, хато ё рад) — ҳисоботи оддӣ бе он ҳам фиристода мешавад */
  async summarize(scope: InsightScope): Promise<string | null> {
    if (!this.client || !scope.branchIds.length) return null;
    try {
      return await this.ask(SYSTEM, JSON.stringify(await this.collectFacts(scope)));
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  /**
   * Санҷиши кассаи пӯшидашуда: аввал қоидаҳои оддӣ (камомад, камомадҳои такрорӣ, тахфиф ва қарзи аз
   * миёна хеле зиёд). Агар чизе ёфт шавад — AI мефаҳмонад; бе калиди AI худи сабабҳо фиристода мешаванд.
   */
  async auditCashClosing(p: {
    organizationId: number;
    userId: number;
    fullName: string;
    day: Date;
    today: { orders: number; cashSales: number; cardSales: number; debtSales: number; discounts: number; diff: number; note: string };
  }): Promise<string | null> {
    try {
      const since = startOfLocalDay(p.day, -30);
      const [history, past] = await Promise.all([
        this.prisma.cashClosing.findMany({
          where: { organizationId: p.organizationId, userId: p.userId, day: { gte: since, lt: p.day } },
          orderBy: { day: 'desc' },
          select: { day: true, diff: true, orders: true },
        }),
        this.prisma.order.aggregate({
          where: { userId: p.userId, branch: { organizationId: p.organizationId }, createdAt: { gte: since, lt: p.day } },
          _sum: { total: true, discount: true },
        }),
      ]);
      const t = p.today;
      const sales = t.cashSales + t.cardSales + t.debtSales;
      const pastSales = Number(past._sum.total ?? 0);
      const pastDiscountShare = pastSales ? Number(past._sum.discount ?? 0) / (pastSales + Number(past._sum.discount ?? 0)) : 0;
      const discountShare = sales ? t.discounts / (sales + t.discounts) : 0;
      const recentShortages = history.slice(0, 7).filter((h) => Number(h.diff) < 0).length;

      const signals: string[] = [];
      if (t.diff < 0) signals.push(`Камомади касса: ${-t.diff} сомонӣ`);
      if (t.diff < 0 && recentShortages >= 2) signals.push(`Дар 7 пӯшидани охир боз ${recentShortages} бор камомад буд`);
      if (t.discounts > 0 && discountShare > Math.max(pastDiscountShare * 2, 0.05))
        signals.push(`Тахфифҳо ${Math.round(discountShare * 100)}% (одатан ${Math.round(pastDiscountShare * 100)}%)`);
      if (sales && t.debtSales / sales > 0.3) signals.push(`${Math.round((t.debtSales / sales) * 100)}% фурӯш ба қарз`);
      if (!signals.length) return null;

      const facts = {
        cashier: p.fullName,
        today: t,
        signals,
        last30Days: {
          closings: history.map((h) => ({ day: h.day.toISOString().slice(0, 10), diff: Number(h.diff), orders: h.orders })),
          discountShare: Math.round(pastDiscountShare * 100),
        },
      };
      const text = this.client ? await this.ask(CASH_SYSTEM, JSON.stringify(facts)) : null;
      return text ?? signals.map((s) => `• ${s}`).join('\n');
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  /** Як дархости кӯтоҳ ба Claude; рад ё хато — null */
  private async ask(system: string, content: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content }],
      });
      if (response.stop_reason === 'refusal') return null;
      const text = response.content
        .flatMap((b) => (b.type === 'text' ? [b.text] : []))
        .join('')
        .trim();
      return text || null;
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) this.logger.warn('Claude: лимит — ҷавоб партофта шуд');
      else if (e instanceof Anthropic.APIError) this.logger.warn(`Claude ${e.status}: ${e.message}`);
      else throw e;
      return null;
    }
  }
}
