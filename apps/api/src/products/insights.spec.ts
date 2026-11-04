import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classify, type InsightInput } from './insights';

const row = (o: Partial<InsightInput>): InsightInput => ({
  productId: 1,
  name: 'Мол',
  emoji: '📦',
  unit: 'дона',
  price: 100,
  cost: 60,
  soldQty: 30,
  revenue: 3000,
  profit: 1200,
  stock: 10,
  lastSoldAt: new Date('2026-11-01T00:00:00Z'),
  ...o,
});

describe('Моли мурда ва фоиданашаванда', () => {
  it('мол ҳаст, вале дар 30 рӯз фурӯш нест — «мурда», пули хобида = боқимонда × арзиш', () => {
    const r = classify([row({ soldQty: 0, revenue: 0, profit: 0, stock: 5, lastSoldAt: null })], 30);
    assert.deepEqual(r.items[0].flags, ['dead']);
    assert.equal(r.frozen, 300);
    assert.equal(r.dead, 1);
  });

  it('боқимонда барои 90+ рӯз — «суст»', () => {
    // 3 дона дар 30 рӯз = 0,1 дар рӯз; 100 дона → 1000 рӯз
    const r = classify([row({ soldQty: 3, stock: 100 })], 30);
    assert.deepEqual(r.items[0].flags, ['slow']);
    assert.equal(r.items[0].daysOfStock, 1000);
  });

  it('нарх аз арзиш паст — «зарар»; маржаи 10% — «паст»', () => {
    assert.deepEqual(classify([row({ price: 50, cost: 60, profit: -300 })], 30).items[0].flags, ['loss']);
    assert.deepEqual(classify([row({ price: 100, cost: 90 })], 30).items[0].flags, ['low']);
  });

  it('моли хуб — бе нишона; моли ҳисобнашаванда «мурда» намешавад', () => {
    assert.deepEqual(classify([row({})], 30).items[0].flags, []);
    assert.deepEqual(classify([row({ soldQty: 0, stock: null })], 30).items[0].flags, []);
  });

  it('бадтаринҳо аввал: пули бештари хобида болотар', () => {
    const r = classify(
      [row({ productId: 1, soldQty: 0, stock: 1 }), row({ productId: 2, soldQty: 0, stock: 50 }), row({ productId: 3 })],
      30,
    );
    assert.deepEqual(r.items.map((i) => i.productId), [2, 1, 3]);
  });
});
