import type { ProductInsight, ProductInsights } from '@filialhub/shared';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Маржаи паст: аз ин камтар — мол қариб фоида намедиҳад (иҷора, маош ва барқ онро мехӯранд) */
export const LOW_MARGIN = 15;
/** Боқимонда барои зиёда аз ин қадар рӯз — пул дар раф хобидааст */
export const SLOW_DAYS = 90;

export interface InsightInput {
  productId: number;
  name: string;
  emoji: string;
  unit: string;
  price: number;
  cost: number;
  soldQty: number;
  revenue: number;
  profit: number;
  stock: number | null;
  lastSoldAt: Date | null;
}

/**
 * Аз фурӯши давра ва боқимонда: кадом мол «мурда» (ҳаст, вале намефурӯшад), «суст» (барои 90+ рӯз),
 * «зарар» (нарх ≤ арзиш) ё «маржаи паст». Бадтаринҳо аввал — аз рӯи пули хобида ва зарар.
 */
export function classify(rows: InsightInput[], days: number): ProductInsights {
  const items: ProductInsight[] = rows.map((r) => {
    const margin = r.price > 0 ? Math.round(((r.price - r.cost) / r.price) * 1000) / 10 : 0;
    const stock = r.stock;
    const stockValue = stock !== null ? r2(Math.max(0, stock) * r.cost) : 0;
    const perDay = r.soldQty > 0 ? r.soldQty / days : 0;
    const daysOfStock = stock !== null && stock > 0 && perDay > 0 ? Math.round(stock / perDay) : null;
    const flags: ProductInsight['flags'] = [];
    if (stock !== null && stock > 0 && r.soldQty <= 0) flags.push('dead');
    else if (daysOfStock !== null && daysOfStock > SLOW_DAYS) flags.push('slow');
    if (r.price <= r.cost || r.profit < 0) flags.push('loss');
    else if (margin < LOW_MARGIN) flags.push('low');
    return {
      productId: r.productId,
      name: r.name,
      emoji: r.emoji,
      unit: r.unit,
      price: r.price,
      cost: r.cost,
      margin,
      soldQty: Math.round(r.soldQty * 1000) / 1000,
      revenue: r2(r.revenue),
      profit: r2(r.profit),
      stock,
      stockValue,
      lastSoldAt: r.lastSoldAt?.toISOString() ?? null,
      daysOfStock,
      flags,
    };
  });
  const score = (i: ProductInsight) => (i.flags.includes('dead') || i.flags.includes('slow') ? i.stockValue : 0) + (i.flags.includes('loss') ? Math.abs(i.profit) + 1 : 0);
  items.sort((a, b) => score(b) - score(a) || a.margin - b.margin);
  const count = (f: ProductInsight['flags'][number]) => items.filter((i) => i.flags.includes(f)).length;
  return {
    days,
    items,
    frozen: r2(items.filter((i) => i.flags.includes('dead') || i.flags.includes('slow')).reduce((s, i) => s + i.stockValue, 0)),
    dead: count('dead'),
    slow: count('slow'),
    loss: count('loss'),
    low: count('low'),
  };
}
