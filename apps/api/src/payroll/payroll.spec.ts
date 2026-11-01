import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { monthRange, summarize } from './payroll';

const H = 3600_000;
const now = new Date('2026-10-31T12:00:00Z');
const at = (iso: string) => new Date(iso);

describe('маош аз рӯи давомот', () => {
  it('моҳ: оғоз ва охир бо вақти Душанбе; моҳи нодуруст — 400', () => {
    const r = monthRange('2026-10');
    assert.equal(r.from.toISOString(), '2026-09-30T19:00:00.000Z');
    assert.equal(r.to.toISOString(), '2026-10-31T19:00:00.000Z');
    assert.equal(monthRange('2026-12').to.toISOString(), '2026-12-31T19:00:00.000Z');
    assert.equal(monthRange(undefined, now).key, '2026-10');
    assert.throws(() => monthRange('2026-13'), BadRequestException);
    assert.throws(() => monthRange('10.2026'), BadRequestException);
  });

  it('3 смена: 2 омад (яке дер), 1 наомад → маош × 2/3', () => {
    const s = [
      { startsAt: at('2026-10-27T04:00:00Z'), endsAt: at('2026-10-27T12:00:00Z'), checkInAt: at('2026-10-27T04:00:00Z'), checkOutAt: at('2026-10-27T12:00:00Z') },
      { startsAt: at('2026-10-28T04:00:00Z'), endsAt: at('2026-10-28T12:00:00Z'), checkInAt: at('2026-10-28T04:30:00Z'), checkOutAt: at('2026-10-28T12:00:00Z') },
      { startsAt: at('2026-10-29T04:00:00Z'), endsAt: at('2026-10-29T12:00:00Z'), checkInAt: null, checkOutAt: null },
    ];
    const r = summarize(3000, s, now);
    assert.equal(r.planned, 3);
    assert.equal(r.attended, 2);
    assert.equal(r.absent, 1);
    assert.equal(r.lateCount, 1);
    assert.equal(r.lateMinutes, 30);
    assert.equal(r.workedDays, 2);
    assert.equal(r.hours, 15.5);
    assert.equal(r.suggestedPay, 2000);
  });

  it('сменаи оянда ҳоло ба ҷадвал ҳисоб намешавад', () => {
    const r = summarize(3000, [{ startsAt: new Date(now.getTime() + 24 * H), endsAt: new Date(now.getTime() + 32 * H), checkInAt: null, checkOutAt: null }], now);
    assert.equal(r.planned, 0);
    assert.equal(r.suggestedPay, 3000);
  });

  it('бе ҷадвал («Омадам» худкор) — маоши пурра, соатҳо ҳисоб мешаванд', () => {
    const t = at('2026-10-30T05:00:00Z');
    const r = summarize(2500, [{ startsAt: t, endsAt: new Date(t.getTime() + 8 * H), checkInAt: t, checkOutAt: new Date(t.getTime() + 6 * H), isAdHoc: true }], now);
    assert.equal(r.planned, 0);
    assert.equal(r.workedDays, 1);
    assert.equal(r.hours, 6);
    assert.equal(r.suggestedPay, 2500);
  });
});
