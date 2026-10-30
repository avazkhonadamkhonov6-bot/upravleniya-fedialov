import { Injectable, Logger } from '@nestjs/common';
import { AlertsService } from '../core/alerts.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/**
 * Анбори ҳар филиал: ҳангоми фурӯш (POS ва фармоиши онлайн) аз ҳамон филиал кам мешавад.
 * Product.stock — ҷамъи ҳамаи филиалҳо; молҳое, ки stock = null доранд, ҳисоб карда намешаванд.
 * Агар боқимондаи филиал аз ҳадди lowStock (ё 0) гузарад — 🔔 ба шеф ва менеҷерони ҳамон филиал.
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger('Stock');

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  /** Дар дохили транзаксияи фурӯш; бармегардонад молҳое, ки акнун кам монданд (огоҳӣ пас аз commit) */
  async take(tx: Tx, branchId: number, lines: { productId: number | null; qty: number }[]) {
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
      const p = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: { name: true, unit: true, lowStock: true } });
      const now = Number(row.qty);
      const limit = p.lowStock === null ? 0 : Number(p.lowStock);
      // Огоҳӣ танҳо вақте ки маҳз ҳамин фурӯш ҳадро убур кард — на дар ҳар фурӯши баъдӣ
      if (now <= limit && now + l.qty > limit) low.push({ name: p.name, stock: now, unit: p.unit });
    }
    return low;
  }

  /** Қабул (add) ё ҳисоби дастӣ (set) дар як филиал; ҷамъи Product.stock аз нав ҳисоб мешавад */
  async adjust(productId: number, branchId: number, change: { add?: number; set?: number }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.branchStock.upsert({
        where: { productId_branchId: { productId, branchId } },
        create: { productId, branchId, qty: change.set ?? change.add ?? 0 },
        update: { qty: change.set !== undefined ? change.set : { increment: change.add ?? 0 } },
      });
      return this.resum(tx, productId);
    });
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
