import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import type { AlertsService } from '../core/alerts.service';
import type { EventsService } from '../core/events';
import type { PrismaService } from '../prisma/prisma.service';
import { shortages, StockService } from './stock';

const cola = { id: 1, name: 'Кола', unit: 'дона' };
const rice = { id: 2, name: 'Биринҷ', unit: 'кг' };

describe('Анбор: аз боқимонда зиёд фурӯхтан мумкин нест', () => {
  it('кифоя — хато нест', () => {
    assert.deepEqual(shortages([{ productId: 1, qty: 3 }], [cola], new Map([[1, 5]]), new Map()), []);
  });

  it('охирин дона — мумкин, як дона зиёд — не', () => {
    assert.deepEqual(shortages([{ productId: 1, qty: 5 }], [cola], new Map([[1, 5]]), new Map()), []);
    assert.deepEqual(shortages([{ productId: 1, qty: 6 }], [cola], new Map([[1, 5]]), new Map()), [{ name: 'Кола', unit: 'дона', free: 5 }]);
  });

  it('фармоиши онлайни кушода молро банд мекунад', () => {
    // 5 дар анбор, 3 банд → касса танҳо 2 мефурӯшад
    assert.deepEqual(shortages([{ productId: 1, qty: 3 }], [cola], new Map([[1, 5]]), new Map([[1, 3]])), [{ name: 'Кола', unit: 'дона', free: 2 }]);
  });

  it('як мол дар ду сатр ҷамъ мешавад', () => {
    const lines = [{ productId: 1, qty: 2 }, { productId: 1, qty: 2 }];
    assert.equal(shortages(lines, [cola], new Map([[1, 3]]), new Map()).length, 1);
  });

  it('миқдори касрӣ (кг) дақиқ ҳисоб мешавад', () => {
    assert.deepEqual(shortages([{ productId: 2, qty: 0.1 }, { productId: 2, qty: 0.2 }], [rice], new Map([[2, 0.3]]), new Map()), []);
    assert.equal(shortages([{ productId: 2, qty: 1.5 }], [rice], new Map([[2, 1.25]]), new Map())[0].free, 1.25);
  });

  it('моли ҳисобнашаванда (stock = null) маҳдуд нест', () => {
    assert.deepEqual(shortages([{ productId: 9, qty: 1000 }], [], new Map(), new Map()), []);
  });

  it('банд аз анбор зиёд — озод 0, на манфӣ', () => {
    assert.deepEqual(shortages([{ productId: 1, qty: 1 }], [cola], new Map([[1, 2]]), new Map([[1, 4]])), [{ name: 'Кола', unit: 'дона', free: 0 }]);
  });
});

describe('StockService.ensure', () => {
  function tx(have: number, reserved: number) {
    const queries: string[] = [];
    const db = {
      product: { findMany: async () => [cola] },
      branchStock: { findMany: async () => [{ productId: 1, branchId: 7, qty: have }] },
      $queryRaw: async (q: TemplateStringsArray | { sql?: string; strings?: string[] }) => {
        const text = Array.isArray(q) ? q.join('?') : ((q as { strings?: string[] }).strings ?? []).join('?');
        queries.push(text);
        return text.includes('OnlineOrderItem') ? (reserved ? [{ productId: 1, branchId: 7, qty: reserved }] : []) : [];
      },
    };
    return { db, queries };
  }
  const service = new StockService({} as PrismaService, {} as AlertsService, {} as EventsService);

  it('сатри анбор қулф мешавад (FOR UPDATE) — ду кассир якбора охирин донаро намефурӯшанд', async () => {
    const { db, queries } = tx(5, 0);
    await service.ensure(db as never, 7, [{ productId: 1, qty: 5 }]);
    assert.ok(queries.some((q) => q.includes('FOR UPDATE')));
  });

  it('хато бо номи мол ва миқдори озод', async () => {
    const { db } = tx(5, 3);
    await assert.rejects(service.ensure(db as never, 7, [{ productId: 1, qty: 3 }]), (e: Error) => e instanceof BadRequestException && e.message === '«Кола»: дар анбор танҳо 2 дона ҳаст');
  });

  it('тамом — «дар анбор нест»', async () => {
    const { db } = tx(0, 0);
    await assert.rejects(service.ensure(db as never, 7, [{ productId: 1, qty: 1 }]), /«Кола» дар анбор нест/);
  });
});
