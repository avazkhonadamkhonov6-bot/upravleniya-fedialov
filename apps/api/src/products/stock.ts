import { Injectable, Logger } from '@nestjs/common';
import { AlertsService } from '../core/alerts.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/**
 * Боқимонда дар анбор: ҳангоми фурӯш (POS ва фармоиши онлайн) кам мешавад.
 * Молҳое, ки боқимонда надоранд (stock = null), ҳисоб карда намешаванд.
 * Агар боқимонда аз ҳадди lowStock (ё 0) гузарад — 🔔 ба шеф ва менеҷерони филиал.
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger('Stock');

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  /** Дар дохили транзаксияи фурӯш; бармегардонад молҳое, ки акнун кам монданд (огоҳӣ пас аз commit) */
  async take(tx: Tx, lines: { productId: number | null; qty: number }[]) {
    const low: { name: string; stock: number; unit: string }[] = [];
    for (const l of lines) {
      if (!l.productId) continue;
      // Танҳо молҳои ҳисобшаванда; декремент дар худи SQL — ду фурӯши ҳамзамон ҳамдигарро намепӯшонанд
      const { count } = await tx.product.updateMany({ where: { id: l.productId, stock: { not: null } }, data: { stock: { decrement: l.qty } } });
      if (!count) continue;
      const p = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: { name: true, unit: true, stock: true, lowStock: true } });
      const now = Number(p.stock);
      const limit = p.lowStock === null ? 0 : Number(p.lowStock);
      // Огоҳӣ танҳо вақте ки маҳз ҳамин фурӯш ҳадро убур кард — на дар ҳар фурӯши баъдӣ
      if (now <= limit && now + l.qty > limit) low.push({ name: p.name, stock: now, unit: p.unit });
    }
    return low;
  }

  async warn(branchId: number, low: { name: string; stock: number; unit: string }[]) {
    for (const p of low) {
      const title = p.stock <= 0 ? `Тамом шуд: ${p.name}` : `Кам монд: ${p.name}`;
      await this.alerts
        .notifyBranch(branchId, { icon: '📦', title, body: `Боқимонда: ${Math.max(0, p.stock)} ${p.unit}`, link: '/products' }, { includeChefs: true })
        .catch((e) => this.logger.warn((e as Error).message));
    }
  }
}
