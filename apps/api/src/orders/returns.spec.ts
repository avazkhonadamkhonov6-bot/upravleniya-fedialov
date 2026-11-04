import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { planReturn } from './orders';

// Чек: 2 × 100 + 1 × 50 = 250, тахфиф 50 → мизоҷ 200 пардохт кард, 10 балл гирифт, 20 балл истифода бурд
const sale = {
  total: 200,
  pointsUsed: 20,
  pointsEarned: 10,
  items: [
    { productId: 1, qty: 2, unitPrice: 100, unitCost: 60 },
    { productId: 2, qty: 1, unitPrice: 50, unitCost: 20 },
  ],
};

describe('Возврат', () => {
  it('пул мутаносибан ба он чи пардохт шуд (пас аз тахфиф)', () => {
    const p = planReturn(sale, [], [{ productId: 1, qty: 1 }]);
    // 100 аз 250 = 40% → 40% аз 200 = 80
    assert.equal(p.refund, 80);
    assert.equal(p.cost, 60);
    assert.equal(p.pointsBack, 8);
    assert.equal(p.pointsRemove, 4);
  });

  it('возврати пурра — ҳамаи пул, бонус ва арзиш', () => {
    const p = planReturn(sale, [], [{ productId: 1, qty: 2 }, { productId: 2, qty: 1 }]);
    assert.equal(p.refund, 200);
    assert.equal(p.cost, 140);
    assert.equal(p.pointsBack, 20);
    assert.equal(p.pointsRemove, 10);
  });

  it('возврати охирин боқимондаи дақиқро медиҳад (тийин гум намешавад)', () => {
    const odd = { total: 100, pointsUsed: 0, pointsEarned: 0, items: [{ productId: 1, qty: 3, unitPrice: 40, unitCost: 10 }] };
    const first = planReturn(odd, [], [{ productId: 1, qty: 1 }]);
    const second = planReturn(odd, [{ total: -first.refund, items: [{ productId: 1, qty: -1 }] }], [{ productId: 1, qty: 1 }]);
    const done = [
      { total: -first.refund, items: [{ productId: 1, qty: -1 }] },
      { total: -second.refund, items: [{ productId: 1, qty: -1 }] },
    ];
    const last = planReturn(odd, done, [{ productId: 1, qty: 1 }]);
    assert.equal(Math.round((first.refund + second.refund + last.refund) * 100) / 100, 100);
  });

  it('аз фурӯхта зиёд баргардонидан мумкин нест', () => {
    assert.throws(() => planReturn(sale, [], [{ productId: 2, qty: 2 }]), BadRequestException);
    const already = [{ total: -80, items: [{ productId: 1, qty: -2 }] }];
    assert.throws(() => planReturn(sale, already, [{ productId: 1, qty: 1 }]), /пурра баргардонида шуд/);
  });

  it('моли бегона дар чек нест', () => {
    assert.throws(() => planReturn(sale, [], [{ productId: 99, qty: 1 }]), /дар чек нест/);
  });

  it('як мол дар ду сатри дархост ҷамъ мешавад', () => {
    assert.throws(() => planReturn(sale, [], [{ productId: 2, qty: 1 }, { productId: 2, qty: 1 }]), BadRequestException);
  });
});
