import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AlertsService } from '../core/alerts.service';
import { EventsService } from '../core/events';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/** Фармоиши онлайн, ки ҳанӯз расонида нашуд, молро банд мекунад — касса ва мизоҷи дигар онро фурӯхта наметавонанд */
const OPEN_ONLINE = Prisma.sql`o.status::text IN ('NEW', 'ACCEPTED', 'DELIVERING')`;

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Молҳое, ки кифоя нестанд: озод = дар анбор − банд. Миқдорҳои як мол дар чанд сатр ҷамъ мешаванд.
 * tracked — танҳо молҳои ҳисобшаванда (stock ≠ null); дигарон ҳеҷ гоҳ маҳдуд нестанд.
 */
export function shortages(
  lines: { productId: number | null; qty: number }[],
  tracked: { id: number; name: string; unit: string }[],
  have: Map<number, number>,
  reserved: Map<number, number>,
): { name: string; unit: string; free: number }[] {
  const want = new Map<number, number>();
  for (const l of lines) if (l.productId) want.set(l.productId, (want.get(l.productId) ?? 0) + l.qty);
  return tracked
    .map((p) => ({ ...p, free: r3(Math.max(0, (have.get(p.id) ?? 0) - (reserved.get(p.id) ?? 0))) }))
    .filter((p) => r3(want.get(p.id) ?? 0) > p.free)
    .map(({ name, unit, free }) => ({ name, unit, free }));
}

export function shortageMessage(s: { name: string; unit: string; free: number }) {
  return s.free <= 0 ? `«${s.name}» дар анбор нест` : `«${s.name}»: дар анбор танҳо ${s.free} ${s.unit} ҳаст`;
}

export type StockReason = 'SALE' | 'ONLINE' | 'PURCHASE' | 'ADJUST' | 'WRITE_OFF' | 'RETURN' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'STOCKTAKE';

/** Натиҷаи инвентаризатсия барои як мол */
export interface StocktakeLine {
  productId: number;
  name: string;
  unit: string;
  before: number;
  counted: number;
  /** + зиёдатӣ, − камомад */
  diff: number;
  /** diff × арзиши аслӣ */
  value: number;
}

/** Маълумоти иловагӣ барои таърихи анбор */
export interface StockMeta {
  userId?: number | null;
  orderId?: number | null;
  reason?: StockReason;
  supplier?: string;
  unitCost?: number | null;
  note?: string;
}

/**
 * Анбори ҳар филиал: ҳангоми фурӯш (POS ва фармоиши онлайн) аз ҳамон филиал кам мешавад.
 * Product.stock — ҷамъи ҳамаи филиалҳо; молҳое, ки stock = null доранд, ҳисоб карда намешаванд.
 * Агар боқимондаи филиал аз ҳадди lowStock (ё 0) гузарад — 🔔 ба шеф ва менеҷерони ҳамон филиал.
 * Ҳар тағйир дар StockMove сабт мешавад (кӣ, кай, чаро, чанд, таъминкунанда, боқимонда).
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger('Stock');

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly events: EventsService,
  ) {}

  /** Пас аз commit: ҳамаи кассаҳо ва саҳифаи «Анбор»-и ширкат боқимондаро фавран нав мекунанд */
  changed(organizationId: number) {
    this.events.emitOrg(organizationId, 'stock');
  }

  /**
   * Миқдори банд дар фармоишҳои онлайни кушода: { productId: { branchId: миқдор } }.
   * Барои як филиал (branchId) ё ҳамаи филиалҳои мағоза (organizationId).
   */
  async reserved(db: Tx, by: { branchId: number } | { organizationId: number }, exceptOnlineId?: number) {
    const rows = await db.$queryRaw<{ productId: number; branchId: number; qty: number }[]>(Prisma.sql`
      SELECT oi."productId", o."branchId", SUM(oi.qty)::float AS qty
      FROM "OnlineOrderItem" oi JOIN "OnlineOrder" o ON o.id = oi."onlineOrderId"
      WHERE ${OPEN_ONLINE} AND oi."productId" IS NOT NULL AND o."branchId" IS NOT NULL
        AND ${'branchId' in by ? Prisma.sql`o."branchId" = ${by.branchId}` : Prisma.sql`o."organizationId" = ${by.organizationId}`}
        ${exceptOnlineId ? Prisma.sql`AND o.id <> ${exceptOnlineId}` : Prisma.empty}
      GROUP BY 1, 2`);
    const out = new Map<number, Map<number, number>>();
    for (const r of rows) {
      if (!out.has(r.productId)) out.set(r.productId, new Map());
      out.get(r.productId)!.set(r.branchId, r.qty);
    }
    return out;
  }

  /**
   * Пеш аз фурӯш ё фармоиш: агар ягон мол кифоя набошад — 400 бо номи мол ва миқдори озод.
   * Дар транзаксия сатрҳои анбор қулф мешаванд (FOR UPDATE): ду кассир ё ду мизоҷ дар як сония
   * охирин донаро якбора фурӯхта наметавонанд — дуюмӣ интизор мешавад ва баъд хато мегирад.
   */
  async ensure(tx: Tx, branchId: number, lines: { productId: number | null; qty: number }[], exceptOnlineId?: number) {
    const ids = [...new Set(lines.map((l) => l.productId).filter((x): x is number => !!x))];
    if (!ids.length) return;
    const tracked = await tx.product.findMany({ where: { id: { in: ids }, stock: { not: null } }, select: { id: true, name: true, unit: true } });
    if (!tracked.length) return;
    const trackedIds = tracked.map((p) => p.id);
    await tx.$queryRaw`SELECT 1 FROM "BranchStock" WHERE "branchId" = ${branchId} AND "productId" = ANY(${trackedIds}) FOR UPDATE`;
    const rows = await tx.branchStock.findMany({ where: { branchId, productId: { in: trackedIds } } });
    const have = new Map(rows.map((r) => [r.productId, Number(r.qty)]));
    const held = await this.reserved(tx, { branchId }, exceptOnlineId);
    const reserved = new Map([...held].map(([id, byBranch]) => [id, byBranch.get(branchId) ?? 0]));
    const short = shortages(lines, tracked, have, reserved);
    if (short.length) throw new BadRequestException(short.map(shortageMessage).join('; '));
  }

  /** Дар дохили транзаксияи фурӯш; бармегардонад молҳое, ки акнун кам монданд (огоҳӣ пас аз commit) */
  async take(tx: Tx, branchId: number, lines: { productId: number | null; qty: number }[], meta: StockMeta = {}) {
    const low: { name: string; stock: number; unit: string }[] = [];
    for (const l of lines) {
      if (!l.productId) continue;
      // Танҳо молҳои ҳисобшаванда; декремент дар худи SQL — ду фурӯши ҳамзамон ҳамдигарро намепӯшонанд
      const { count } = await tx.product.updateMany({ where: { id: l.productId, stock: { not: null } }, data: { stock: { decrement: l.qty } } });
      if (!count) continue;
      const row = await tx.branchStock.upsert({
        where: { productId_branchId: { productId: l.productId, branchId } },
        create: { productId: l.productId, branchId, qty: -l.qty },
        update: { qty: { decrement: l.qty } },
      });
      const p = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: { name: true, unit: true, lowStock: true, organizationId: true } });
      const now = Number(row.qty);
      await tx.stockMove.create({
        data: { organizationId: p.organizationId, branchId, productId: l.productId, qty: -l.qty, balance: now, reason: meta.reason ?? 'SALE', orderId: meta.orderId ?? null, userId: meta.userId ?? null },
      });
      const limit = p.lowStock === null ? 0 : Number(p.lowStock);
      // Огоҳӣ танҳо вақте ки маҳз ҳамин фурӯш ҳадро убур кард — на дар ҳар фурӯши баъдӣ
      if (now <= limit && now + l.qty > limit) low.push({ name: p.name, stock: now, unit: p.unit });
    }
    return low;
  }

  /** Возврат: мол ба анбори ҳамон филиал бармегардад (танҳо молҳои ҳисобшаванда) */
  async give(tx: Tx, branchId: number, lines: { productId: number; qty: number }[], meta: StockMeta = {}) {
    for (const l of lines) {
      const { count } = await tx.product.updateMany({ where: { id: l.productId, stock: { not: null } }, data: { stock: { increment: l.qty } } });
      if (!count) continue;
      const row = await tx.branchStock.upsert({
        where: { productId_branchId: { productId: l.productId, branchId } },
        create: { productId: l.productId, branchId, qty: l.qty },
        update: { qty: { increment: l.qty } },
      });
      const p = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: { organizationId: true } });
      await tx.stockMove.create({
        data: { organizationId: p.organizationId, branchId, productId: l.productId, qty: l.qty, balance: row.qty, reason: meta.reason ?? 'RETURN', orderId: meta.orderId ?? null, userId: meta.userId ?? null, note: meta.note?.trim() ?? '' },
      });
    }
  }

  /**
   * Интиқол аз як филиал ба дигар. Аз манбаъ танҳо моли озод (бе банди онлайн) мебарояд;
   * ҷамъи Product.stock тағйир намеёбад. Ду сабт дар таърих: TRANSFER_OUT ва TRANSFER_IN.
   */
  async transfer(productId: number, fromBranchId: number, toBranchId: number, qty: number, meta: StockMeta = {}) {
    if (fromBranchId === toBranchId) throw new BadRequestException('Филиали дигарро интихоб кунед');
    if (!(qty > 0)) throw new BadRequestException('Миқдорро нависед');
    const product = await this.prisma.$transaction(async (tx) => {
      const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { organizationId: true, stock: true } });
      if (p.stock === null) throw new BadRequestException('Ин мол дар анбор ҳисоб карда намешавад');
      await this.ensure(tx, fromBranchId, [{ productId, qty }]);
      const branches = await tx.branch.findMany({ where: { id: { in: [fromBranchId, toBranchId] } }, select: { id: true, name: true } });
      const name = (id: number) => branches.find((b) => b.id === id)?.name ?? `#${id}`;
      const note = meta.note?.trim() ? ` · ${meta.note.trim()}` : '';
      const out = await tx.branchStock.update({ where: { productId_branchId: { productId, branchId: fromBranchId } }, data: { qty: { decrement: qty } } });
      const into = await tx.branchStock.upsert({
        where: { productId_branchId: { productId, branchId: toBranchId } },
        create: { productId, branchId: toBranchId, qty },
        update: { qty: { increment: qty } },
      });
      const base = { organizationId: p.organizationId, productId, userId: meta.userId ?? null };
      await tx.stockMove.createMany({
        data: [
          { ...base, branchId: fromBranchId, qty: -qty, balance: out.qty, reason: 'TRANSFER_OUT', note: `→ ${name(toBranchId)}${note}` },
          { ...base, branchId: toBranchId, qty, balance: into.qty, reason: 'TRANSFER_IN', note: `← ${name(fromBranchId)}${note}` },
        ],
      });
      return tx.product.findUniqueOrThrow({ where: { id: productId }, include: { branchStocks: true } });
    });
    this.changed(product.organizationId);
    return product;
  }

  /**
   * Инвентаризатсия: миқдори шумурдашуда ба ҷои рақами система; фарқ (камомад ё зиёдатӣ) дар таърих
   * бо сабаби STOCKTAKE ва арзиши он бо нархи аслӣ. Сатрҳо қулф мешаванд — фурӯши ҳамзамон гум намешавад.
   */
  async stocktake(organizationId: number, branchId: number, counts: { productId: number; qty: number }[], meta: StockMeta = {}) {
    const ids = [...new Set(counts.map((c) => c.productId))];
    if (!ids.length) throw new BadRequestException('Ақаллан як молро шумуред');
    if (ids.length !== counts.length) throw new BadRequestException('Як мол ду бор навишта шудааст');
    const lines = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: ids }, organizationId, stock: { not: null } }, select: { id: true, name: true, unit: true, cost: true } });
      if (products.length !== ids.length) throw new BadRequestException('Баъзе молҳо ёфт нашуданд ё дар анбор ҳисоб карда намешаванд');
      await tx.$queryRaw`SELECT 1 FROM "BranchStock" WHERE "branchId" = ${branchId} AND "productId" = ANY(${ids}) FOR UPDATE`;
      const rows = await tx.branchStock.findMany({ where: { branchId, productId: { in: ids } } });
      const out: StocktakeLine[] = [];
      for (const c of counts) {
        const p = products.find((x) => x.id === c.productId)!;
        const before = Number(rows.find((r) => r.productId === c.productId)?.qty ?? 0);
        const counted = r3(c.qty);
        const diff = r3(counted - before);
        out.push({ productId: p.id, name: p.name, unit: p.unit, before, counted, diff, value: Math.round(diff * Number(p.cost) * 100) / 100 });
        if (!diff) continue;
        await tx.branchStock.upsert({
          where: { productId_branchId: { productId: p.id, branchId } },
          create: { productId: p.id, branchId, qty: counted },
          update: { qty: counted },
        });
        await tx.stockMove.create({
          data: { organizationId, branchId, productId: p.id, qty: diff, balance: counted, reason: 'STOCKTAKE', note: meta.note?.trim() ?? '', userId: meta.userId ?? null },
        });
        await this.resum(tx, p.id);
      }
      return out;
    });
    this.changed(organizationId);
    return lines;
  }

  /** Қабул (add) ё ҳисоби дастӣ (set) дар як филиал; ҷамъи Product.stock аз нав ҳисоб мешавад */
  async adjust(productId: number, branchId: number, change: { add?: number; set?: number }, meta: StockMeta = {}) {
    const product = await this.prisma.$transaction(async (tx) => {
      const before = await tx.branchStock.findUnique({ where: { productId_branchId: { productId, branchId } } });
      const row = await tx.branchStock.upsert({
        where: { productId_branchId: { productId, branchId } },
        create: { productId, branchId, qty: change.set ?? change.add ?? 0 },
        update: { qty: change.set !== undefined ? change.set : { increment: change.add ?? 0 } },
      });
      const delta = Number(row.qty) - Number(before?.qty ?? 0);
      if (delta !== 0) {
        const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { organizationId: true } });
        const reason: StockReason = meta.reason ?? (change.set !== undefined ? 'ADJUST' : delta > 0 ? 'PURCHASE' : 'WRITE_OFF');
        await tx.stockMove.create({
          data: {
            organizationId: p.organizationId,
            branchId,
            productId,
            qty: delta,
            balance: row.qty,
            reason,
            supplier: reason === 'PURCHASE' ? (meta.supplier?.trim() ?? '') : '',
            unitCost: reason === 'PURCHASE' ? (meta.unitCost ?? null) : null,
            note: meta.note?.trim() ?? '',
            userId: meta.userId ?? null,
          },
        });
      }
      return this.resum(tx, productId);
    });
    this.changed(product.organizationId);
    return product;
  }

  /** Ҷамъи филиалҳо → Product.stock */
  async resum(tx: Tx, productId: number) {
    const agg = await tx.branchStock.aggregate({ where: { productId }, _sum: { qty: true } });
    return tx.product.update({ where: { id: productId }, data: { stock: agg._sum.qty ?? 0 }, include: { branchStocks: true } });
  }

  async warn(branchId: number, low: { name: string; stock: number; unit: string }[]) {
    for (const p of low) {
      const title = p.stock <= 0 ? `Тамом шуд: ${p.name}` : `Кам монд: ${p.name}`;
      await this.alerts
        .notifyBranch(branchId, { icon: '📦', title, body: `Боқимонда дар филиал: ${Math.max(0, p.stock)} ${p.unit}`, link: '/products' }, { includeChefs: true })
        .catch((e) => this.logger.warn((e as Error).message));
    }
  }
}
