import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';
import type { AlertsService } from '../core/alerts.service';
import type { AuditService } from '../core/audit.service';
import type { ChatService } from '../notifications/chat.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ShiftsService } from './shifts';

const cashier = { id: 3, organizationId: 100, role: 'STAFF', branchId: 1, position: 'CASHIER', fullName: 'Кассир Каримов' } as unknown as AuthUser;
const manager = { id: 2, organizationId: 100, role: 'MANAGER', branchId: 1, position: null, fullName: 'Менеҷер Раҳимов' } as unknown as AuthUser;

type Row = { id: number; userId: number; branchId: number; startsAt: Date; endsAt: Date; checkInAt: Date | null; checkOutAt: Date | null };
const people = [
  { id: 1, role: 'CHEF', branchId: null, organizationId: 100, isActive: true, fullName: 'Шеф' },
  { id: 2, role: 'MANAGER', branchId: 1, organizationId: 100, isActive: true, fullName: 'Менеҷер Раҳимов' },
  { id: 3, role: 'STAFF', branchId: 1, organizationId: 100, isActive: true, fullName: 'Кассир Каримов' },
];

/** Prisma-и сохта: сменаҳо дар массив, шартҳои where-и лозимӣ */
function setup(shifts: Row[], opts: { noManager?: boolean } = {}) {
  const alerts: { ids: number[]; title: string; body?: string }[] = [];
  const chats: { to: number; text: string }[] = [];
  let nextId = 100;
  const withRel = (r: Row) => ({ ...r, user: { fullName: people.find((p) => p.id === r.userId)!.fullName, position: null, role: 'STAFF' }, branch: { name: 'Ф1' } });
  const match = (r: Row, w: Record<string, any>) => {
    const cmp = (v: Date | null, c: any) => {
      if (c === undefined) return true;
      if (c === null) return v === null;
      if (c.not === null) return v !== null;
      if (c.not !== undefined) return true;
      if (v === null) return false;
      return (c.lte === undefined || v <= c.lte) && (c.lt === undefined || v < c.lt) && (c.gt === undefined || v > c.gt) && (c.gte === undefined || v >= c.gte);
    };
    return r.userId === w.userId && cmp(r.checkInAt, w.checkInAt) && cmp(r.checkOutAt, w.checkOutAt) && cmp(r.startsAt, w.startsAt) && cmp(r.endsAt, w.endsAt);
  };
  const prisma = {
    shift: {
      findFirst: async ({ where, orderBy }: { where: Record<string, any>; orderBy?: { startsAt: 'asc' | 'desc' } }) => {
        const list = shifts.filter((r) => match(r, where)).sort((a, b) => (orderBy?.startsAt === 'desc' ? -1 : 1) * (a.startsAt.getTime() - b.startsAt.getTime()));
        return list[0] ? withRel(list[0]) : null;
      },
      update: async ({ where, data }: { where: { id: number }; data: Partial<Row> }) => {
        const r = shifts.find((x) => x.id === where.id)!;
        Object.assign(r, data);
        return withRel(r);
      },
      create: async ({ data }: { data: Omit<Row, 'id' | 'checkOutAt'> }) => {
        const r = { id: nextId++, checkOutAt: null, ...data } as Row;
        shifts.push(r);
        return withRel(r);
      },
    },
    user: {
      findMany: async ({ where }: { where: Record<string, any> }) =>
        people.filter((p) => p.organizationId === where.organizationId && p.role === where.role && p.id !== where.id?.not && (where.branchId === undefined || p.branchId === where.branchId) && !(opts.noManager && p.role === 'MANAGER')),
      findUniqueOrThrow: async ({ where }: { where: { id: number } }) => people.find((p) => p.id === where.id),
    },
  } as unknown as PrismaService;
  const alertsSvc = { notify: (ids: number[], a: { title: string; body?: string }) => void alerts.push({ ids, ...a }) } as unknown as AlertsService;
  const chat = { deliver: async (_s: unknown, to: { id: number }, text: string) => void chats.push({ to: to.id, text }) } as unknown as ChatService;
  const s = new ShiftsService(prisma, { log: () => {} } as unknown as AuditService, alertsSvc, chat);
  return { s, alerts, chats, shifts };
}

const H = 3600_000;

describe('«Омадам» — давомот', () => {
  it('бе ҷадвал ҳам кор мекунад: смена худкор кушода мешавад ва менеҷер хабар мегирад', async () => {
    const { s, alerts, shifts } = setup([]);
    const r = await s.checkIn(cashier);
    assert.ok(r.checkInAt);
    assert.equal(shifts.length, 1);
    assert.equal(alerts.length, 1);
    assert.deepEqual(alerts[0].ids, [2]); // танҳо менеҷери филиал
    assert.match(alerts[0].title, /Кассир Каримов омад — \d\d:\d\d/);
    assert.match(alerts[0].body ?? '', /бе ҷадвал/);
  });

  it('барвақт омадан: дақиқаҳо ҳисоб мешаванд ва дар хабар гуфта мешавад', async () => {
    const start = new Date(Date.now() + 40 * 60_000);
    const { s, alerts } = setup([{ id: 1, userId: 3, branchId: 1, startsAt: start, endsAt: new Date(start.getTime() + 8 * H), checkInAt: null, checkOutAt: null }]);
    const r = await s.checkIn(cashier);
    assert.ok(r.earlyMinutes >= 39 && r.earlyMinutes <= 40, String(r.earlyMinutes));
    assert.match(alerts[0].body ?? '', /барвақт/);
  });

  it('дер омадан: «дақ дер»', async () => {
    const start = new Date(Date.now() - 30 * 60_000);
    const { s, alerts } = setup([{ id: 1, userId: 3, branchId: 1, startsAt: start, endsAt: new Date(start.getTime() + 8 * H), checkInAt: null, checkOutAt: null }]);
    const r = await s.checkIn(cashier);
    assert.ok(r.lateMinutes >= 29);
    assert.match(alerts[0].body ?? '', /дақ дер/);
  });

  it('паём ба менеҷер — ба чат меравад (бо вақт ва матн)', async () => {
    const { s, alerts, chats } = setup([]);
    await s.checkIn(cashier, { note: 'Барвақт омадам, анборро тартиб медиҳам' });
    assert.equal(alerts.length, 0); // 🔔-ро худи чат мефиристад
    assert.equal(chats.length, 1);
    assert.equal(chats[0].to, 2);
    assert.match(chats[0].text, /омад — \d\d:\d\d[\s\S]*Барвақт омадам/);
  });

  it('менеҷер омад → хабар ба шеф', async () => {
    const { s, alerts } = setup([]);
    await s.checkIn(manager);
    assert.deepEqual(alerts[0].ids, [1]);
  });

  it('филиал менеҷер надорад → хабари корманд ба шеф', async () => {
    const { s, alerts } = setup([], { noManager: true });
    await s.checkIn(cashier);
    assert.deepEqual(alerts[0].ids, [1]);
  });

  it('ду бор «Омадам» — хато', async () => {
    const { s } = setup([]);
    await s.checkIn(cashier);
    await assert.rejects(s.checkIn(cashier), BadRequestException);
  });

  it('«Рафтам» → вақти рафтан ва соатҳо, хабар ба менеҷер', async () => {
    const { s, alerts } = setup([{ id: 1, userId: 3, branchId: 1, startsAt: new Date(Date.now() - 4 * H), endsAt: new Date(Date.now() + 4 * H), checkInAt: new Date(Date.now() - 4 * H), checkOutAt: null }]);
    const r = await s.checkOut(cashier);
    assert.ok(r.checkOutAt);
    assert.equal(r.hoursWorked, 4);
    assert.match(alerts[0].title, /рафт — \d\d:\d\d/);
    assert.match(alerts[0].body ?? '', /4 соат кор кард · \d+ дақ барвақт рафт/);
  });

  it('барвақт рафт ва баргашт — ҳамон смена боз мешавад', async () => {
    const { s, shifts } = setup([{ id: 1, userId: 3, branchId: 1, startsAt: new Date(Date.now() - 4 * H), endsAt: new Date(Date.now() + 4 * H), checkInAt: new Date(Date.now() - 4 * H), checkOutAt: new Date(Date.now() - H) }]);
    const r = await s.checkIn(cashier);
    assert.equal(shifts.length, 1);
    assert.equal(r.checkOutAt, null);
    assert.equal(r.state, 'ON_SHIFT');
  });
});
