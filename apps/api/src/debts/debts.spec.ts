import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';
import type { AlertsService } from '../core/alerts.service';
import type { AuditService } from '../core/audit.service';
import type { EventsService } from '../core/events';
import type { OrdersService } from '../orders/orders';
import type { PrismaService } from '../prisma/prisma.service';
import { DebtRequestsService } from './debt-requests';
import { debtScope, DebtsService, nextDueAt, parseDueDate, requestScope } from './debts';

const chef = { id: 1, organizationId: 100, branchIds: [1, 2], role: 'CHEF', branchId: null, position: null, fullName: 'Шеф' } as unknown as AuthUser;
const manager = { ...chef, id: 2, role: 'MANAGER', branchId: 1, fullName: 'Менеҷер' } as AuthUser;
const cashier = { ...chef, id: 3, role: 'STAFF', branchId: 1, position: 'CASHIER', fullName: 'Кассир' } as AuthUser;
const seller = { ...cashier, id: 5, position: 'SELLER' } as AuthUser;
const waiter = { ...cashier, id: 4, position: 'WAITER' } as AuthUser;
const cook = { ...cashier, id: 6, position: 'COOK' } as AuthUser;

describe('debtScope — кӣ дафтари қарзро мебинад', () => {
  it('шеф — ҳамаи мизоҷони ширкат', () => {
    assert.deepEqual(debtScope(chef), { organizationId: 100 });
  });

  it('менеҷер ва кассир — танҳо филиали худ', () => {
    assert.deepEqual(debtScope(manager), { organizationId: 100, branchId: 1 });
    assert.deepEqual(debtScope(cashier), { organizationId: 100, branchId: 1 });
    assert.deepEqual(debtScope(seller), { organizationId: 100, branchId: 1 });
  });

  it('официант, ошпаз ва дигарон — ҳеҷ', () => {
    assert.throws(() => debtScope(waiter), ForbiddenException);
    assert.throws(() => debtScope(cook), ForbiddenException);
  });

  it('кассири бе филиал — ҳеҷ', () => {
    assert.throws(() => debtScope({ ...cashier, branchId: null }), ForbiddenException);
  });
});

describe('requestScope — дархостҳо', () => {
  it('шеф — ҳама, менеҷер — филиали худ, кассир — танҳо дархостҳои худаш', () => {
    assert.deepEqual(requestScope(chef), { organizationId: 100 });
    assert.deepEqual(requestScope(manager), { organizationId: 100, branchId: 1 });
    assert.deepEqual(requestScope(cashier), { organizationId: 100, requestedById: 3 });
  });
});

describe('DebtsService.add — қарзи нав', () => {
  it('кассир қарзро бевосита илова карда наметавонад', async () => {
    const s = new DebtsService({} as PrismaService, {} as never, {} as never, {} as never, {} as never);
    await assert.rejects(s.add(cashier, 7, { amount: 50 }), ForbiddenException);
  });
});

type Req = { id: number; status: string; organizationId: number; branchId: number; customerId: number; amount: number; note: string; sale: unknown; requestedById: number | null; decidedById?: number | null; orderId?: number | null };

function setup(req: Req, opts: { failCreate?: boolean } = {}) {
  const calls = { orderCreate: [] as unknown[], debtAdd: [] as unknown[], notified: [] as unknown[] };
  const row = () => ({ ...req, customer: { fullName: 'Мизоҷ', phone: '900', debt: 0 }, branch: { name: 'Ф1' }, requestedBy: null, decidedBy: null, createdAt: new Date(), decidedAt: null });
  const prisma = {
    debtRequest: {
      findFirst: async ({ where }: { where: { id: number; organizationId: number; branchId?: number } }) =>
        where.id === req.id && where.organizationId === req.organizationId && (where.branchId === undefined || where.branchId === req.branchId) ? { ...req } : null,
      updateMany: async ({ where, data }: { where: { status: string }; data: { status: string } }) => {
        if (req.status !== where.status) return { count: 0 };
        req.status = data.status;
        return { count: 1 };
      },
      update: async ({ data }: { data: Partial<Req> }) => {
        Object.assign(req, data);
        return row();
      },
    },
  } as unknown as PrismaService;
  const orders = {
    create: async (...args: unknown[]) => {
      calls.orderCreate.push(args);
      if (opts.failCreate) throw new BadRequestException('Мол тамом шуд');
      return { id: 555 };
    },
  } as unknown as OrdersService;
  const debts = { add: async (...args: unknown[]) => void calls.debtAdd.push(args) } as unknown as DebtsService;
  const alerts = { notify: (...args: unknown[]) => void calls.notified.push(args) } as unknown as AlertsService;
  const s = new DebtRequestsService(prisma, debts, orders, alerts, { emitOrg: () => {} } as unknown as EventsService, { log: () => {} } as unknown as AuditService);
  return { s, calls, req };
}

const manual = (): Req => ({ id: 1, status: 'PENDING', organizationId: 100, branchId: 1, customerId: 7, amount: 50, note: 'нон', sale: null, requestedById: 3 });
const sale = (): Req => ({ ...manual(), id: 2, sale: { branchId: 1, payment: 'DEBT', customerId: 7, items: [{ productId: 10, qty: 1 }], lines: [{ name: 'Нон', qty: 1 }] } });

describe('DebtRequestsService.decide — тасдиқи менеҷер', () => {
  it('кассир дархостро тасдиқ карда наметавонад', async () => {
    const { s } = setup(manual());
    await assert.rejects(s.decide(cashier, 1, 'APPROVE'), ForbiddenException);
  });

  it('менеҷери филиали дигар дархостро намебинад', async () => {
    const { s } = setup(manual());
    await assert.rejects(s.decide({ ...manager, branchId: 2 }, 1, 'APPROVE'));
  });

  it('тасдиқи қарзи дастӣ қарзро илова мекунад ва ба кассир хабар медиҳад', async () => {
    const { s, calls, req } = setup(manual());
    await s.decide(manager, 1, 'APPROVE');
    assert.equal(req.status, 'APPROVED');
    assert.deepEqual(calls.debtAdd, [[manager, 7, { amount: 50, note: 'нон', dueAt: undefined }]]);
    assert.equal(calls.notified.length, 1);
  });

  it('тасдиқи фурӯш ба қарз фурӯшро ба номи кассир сабт мекунад', async () => {
    const { s, calls, req } = setup(sale());
    const r = await s.decide(chef, 2, 'APPROVE');
    const [user, dto, opts] = calls.orderCreate[0] as [AuthUser, Record<string, unknown>, Record<string, unknown>];
    assert.equal(user, chef);
    assert.equal(dto.clientRef, 'debt-request-2'); // ду бор сабт намешавад
    assert.equal('lines' in dto, false);
    assert.deepEqual(opts, { sellerId: 3, approved: true });
    assert.equal(req.status, 'APPROVED');
    assert.equal(r.orderId, 555);
  });

  it('рад — қарз ва фурӯш сабт намешаванд', async () => {
    const { s, calls, req } = setup(sale());
    await s.decide(manager, 2, 'REJECT');
    assert.equal(req.status, 'REJECTED');
    assert.equal(calls.orderCreate.length + calls.debtAdd.length, 0);
  });

  it('дубора тасдиқ кардан мумкин нест', async () => {
    const { s, calls } = setup(manual());
    await s.decide(manager, 1, 'APPROVE');
    await assert.rejects(s.decide(manager, 1, 'APPROVE'), BadRequestException);
    assert.equal(calls.debtAdd.length, 1);
  });

  it('агар фурӯш сабт нашавад, дархост боз интизор мемонад', async () => {
    const { s, req } = setup(sale(), { failCreate: true });
    await assert.rejects(s.decide(manager, 2, 'APPROVE'), BadRequestException);
    assert.equal(req.status, 'PENDING');
  });
});

describe('мӯҳлати қарз', () => {
  const now = new Date('2026-10-31T08:00:00Z'); // 13:00 дар Душанбе
  it('санаи дуруст → оғози ҳамон рӯз бо вақти Душанбе', () => {
    assert.equal(parseDueDate('2026-11-15', now)?.toISOString(), '2026-11-14T19:00:00.000Z');
    assert.ok(parseDueDate('2026-10-31', now)); // имрӯз мумкин
    assert.equal(parseDueDate(undefined, now), null);
    assert.equal(parseDueDate('', now), null);
  });
  it('гузашта, зиёда аз як сол ва санаи нодуруст — 400', () => {
    assert.throws(() => parseDueDate('2026-10-30', now), BadRequestException);
    assert.throws(() => parseDueDate('2027-12-01', now), BadRequestException);
    assert.throws(() => parseDueDate('2026-02-30', now), BadRequestException);
    assert.throws(() => parseDueDate('15.11.2026', now), BadRequestException);
  });
  it('мӯҳлати мизоҷ: қарзи аввал — мӯҳлати нав; баъд — наздиктарин; пас аз пардохт — аз нав', () => {
    const a = new Date('2026-11-10'), b = new Date('2026-11-20');
    assert.equal(nextDueAt(0, a, b), b); // қарз набуд — мӯҳлати кӯҳна аҳамият надорад
    assert.equal(nextDueAt(50, b, a), a); // наздиктарин
    assert.equal(nextDueAt(50, a, b), a);
    assert.equal(nextDueAt(50, null, b), b);
    assert.equal(nextDueAt(50, a, null), a); // қарзи нав бе мӯҳлат — мӯҳлати кӯҳна мемонад
    assert.equal(nextDueAt(0, null, null), null);
  });
});
