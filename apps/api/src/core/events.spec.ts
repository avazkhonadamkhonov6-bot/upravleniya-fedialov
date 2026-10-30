import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events';

function setup() {
  const saved: unknown[] = [];
  const prisma = { user: { update: async (a: unknown) => void saved.push(a) } } as unknown as PrismaService;
  const events = new EventsService(prisma);
  const got: { type: string; data?: object }[] = [];
  // Корбари 1 — дигар корманди ҳамон ширкат, ки «дар шабака»-и дигаронро мебинад
  events.subscribe(1, 100, (type, data) => got.push({ type, data }));
  return { events, got, saved };
}

describe('EventsService — дар шабака / менависад', () => {
  it('кушодани сайт → «дар шабака» ба ҳамкорон', () => {
    const { events, got } = setup();
    events.subscribe(2, 100, () => {});
    assert.equal(events.isOnline(2), true);
    assert.deepEqual(got.at(-1), { type: 'presence', data: { userId: 2, online: true, lastSeenAt: null } });
  });

  it('ширкати дигар «дар шабака»-ро намебинад', () => {
    const { events, got } = setup();
    events.subscribe(9, 200, () => {});
    assert.equal(got.length, 0);
  });

  it('нав кардани саҳифа (пайваст зуд баргашт) — «баромад» нишон дода намешавад', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const { events, got } = setup();
      const off = events.subscribe(2, 100, () => {});
      off();
      events.subscribe(2, 100, () => {});
      mock.timers.tick(10_000);
      assert.deepEqual(got.map((g) => (g.data as { online: boolean }).online), [true]);
    } finally {
      mock.timers.reset();
    }
  });

  it('баромад → пас аз 8 сония «охирин бор» ва сабт дар база', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const { events, got, saved } = setup();
      const off = events.subscribe(2, 100, () => {});
      off();
      assert.equal(events.isOnline(2), false);
      mock.timers.tick(7_000);
      assert.equal(got.length, 1);
      mock.timers.tick(2_000);
      const last = got.at(-1)!.data as { online: boolean; lastSeenAt: string };
      assert.equal(last.online, false);
      assert.ok(last.lastSeenAt);
      assert.equal(saved.length, 1);
    } finally {
      mock.timers.reset();
    }
  });

  it('activity танҳо ба қабулкунанда меравад', () => {
    const { events, got } = setup();
    const other: string[] = [];
    events.subscribe(3, 100, (t) => other.push(t));
    events.emit(1, 'activity', { fromId: 3, kind: 'typing' });
    assert.deepEqual(got.at(-1), { type: 'activity', data: { fromId: 3, kind: 'typing' } });
    assert.equal(other.length, 0);
  });
});
