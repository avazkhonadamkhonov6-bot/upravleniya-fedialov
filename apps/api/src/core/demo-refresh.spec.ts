import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { demoShiftDays, demoShiftSql } from './demo-refresh';

describe('Демо зинда мемонад', () => {
  it('рӯзҳо аз рӯи санаи Душанбе ҳисоб мешаванд', () => {
    // 2026-11-04 00:30 дар Душанбе = 2026-11-03 19:30 UTC
    assert.equal(demoShiftDays('2026-11-01', new Date('2026-11-03T19:30:00Z')), 3);
    assert.equal(demoShiftDays('2026-11-04', new Date('2026-11-03T19:30:00Z')), 0);
  });

  it('санаи оянда — кӯчонидан нест', () => {
    assert.equal(demoShiftDays('2026-12-01', new Date('2026-11-04T10:00:00Z')), 0);
  });

  it('танҳо ширкати демо ва сабтҳои кӯҳна кӯчонида мешаванд', () => {
    const sql = demoShiftSql({ table: 'Order', cols: ['createdAt'], scope: 'branch' });
    assert.match(sql, /^UPDATE "Order" SET "createdAt" = "createdAt" \+ make_interval\(days => \$1\)/);
    assert.match(sql, /"branchId" IN \(SELECT id FROM "Branch" WHERE "organizationId" = \$3\)/);
    assert.match(sql, /"createdAt" <= \$2$/);
    assert.match(demoShiftSql({ table: 'Message', cols: ['createdAt'], scope: { user: 'senderId' } }), /"senderId" IN \(SELECT id FROM "User"/);
  });
});
