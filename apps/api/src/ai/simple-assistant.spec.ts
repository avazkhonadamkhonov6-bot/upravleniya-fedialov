import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cashReply, debtsReply, lateReply, normalize, parseQuestion, salesReply, stockReply } from './simple-assistant';

const BRANCHES = [
  { id: 1, name: 'FilialHub Рӯдакӣ' },
  { id: 2, name: 'FilialHub Сомонӣ' },
  { id: 3, name: 'FilialHub Хуҷанд' },
];
const ask = (text: string) => parseQuestion(text, BRANCHES);

describe('ёрдамчии ройгон: фаҳмидани савол', () => {
  it('ҳарфҳои тоҷикӣ ва аломатҳо', () => {
    assert.equal(normalize('Фурӯши имрӯз — чанд аст?'), 'фуруши имруз чанд аст');
  });

  it('фурӯш ва давра (тоҷикӣ, лотинӣ, русӣ)', () => {
    assert.deepEqual(ask('Фурӯши имрӯз чанд аст?'), { intent: 'sales', when: 'day', branchId: null, overdueOnly: false, lang: 'tg' });
    assert.equal(ask('furushi hafta').when, 'week');
    assert.equal(ask('furushi hafta').intent, 'sales');
    const ru = ask('Какая выручка за месяц?');
    assert.equal(ru.intent, 'sales');
    assert.equal(ru.when, 'month');
    assert.equal(ru.lang, 'ru');
    assert.equal(ask('фоидаи дирӯз').when, 'yesterday');
  });

  it('филиал аз рӯи ном → фурӯши ҳамон филиал; бе ном → муқоиса', () => {
    const one = ask('фурӯши филиали Рӯдакӣ ин ҳафта');
    assert.equal(one.intent, 'sales');
    assert.equal(one.branchId, 1);
    assert.equal(ask('Хуҷанд имрӯз чанд фурӯхт').branchId, 3);
    assert.equal(ask('Ин ҳафта кадом филиал беҳтар фурӯхт?').intent, 'branches');
    assert.equal(ask('Какой филиал лучше?').intent, 'branches');
  });

  it('мол, давомот, қарз, анбор, касса', () => {
    assert.equal(ask('Молҳои беҳтарини ин моҳ').intent, 'products');
    assert.equal(ask('Кӣ имрӯз дер омад?').intent, 'late');
    assert.equal(ask('кто вчера опоздал').when, 'yesterday');
    assert.equal(ask('ki der mond').intent, 'late');
    const debt = ask('Кадом мизоҷон қарзашонро сари вақт надоданд?');
    assert.equal(debt.intent, 'debts');
    assert.equal(debt.overdueOnly, true);
    assert.equal(ask('қарздорон').overdueOnly, false);
    assert.equal(ask('Кадом мол ба зудӣ тамом мешавад?').intent, 'stock');
    assert.equal(ask('что заканчивается на складе').intent, 'stock');
    const cash = ask('Дирӯз касса фарқ дошт?');
    assert.equal(cash.intent, 'cash');
    assert.equal(cash.when, 'yesterday');
  });

  it('саволи номаълум → кӯмак', () => {
    assert.equal(ask('салом').intent, 'help');
    assert.equal(ask('чаро ҳаво хунук аст').intent, 'help');
  });
});

describe('ёрдамчии ройгон: ҷавобҳо', () => {
  it('фурӯш: рақамҳо ва «фурӯш нест»', () => {
    const s = { revenue: 18450, cost: 9000, profit: 9450, expenses: 3330, netProfit: 6120, orders: 34, avgCheck: 542.65 };
    const text = salesReply(s, 'day', null, 'tg');
    assert.match(text, /имрӯз \(ҳамаи филиалҳо\)/);
    assert.match(text, /Фурӯш: 18\s450 сомонӣ/);
    assert.match(text, /Фармоишҳо: 34/);
    assert.match(salesReply({ ...s, orders: 0 }, 'week', 'FilialHub Рӯдакӣ', 'ru'), /продаж нет/);
  });

  it('дермондагон: соат, наомадагон алоҳида, рӯйхати дароз кӯтоҳ', () => {
    const absent = Array.from({ length: 14 }, (_, i) => ({ name: `Корманд ${i + 1}`, branch: 'Сомонӣ', lateMinutes: 400, cameIn: false }));
    const text = lateReply([{ name: 'Алӣ', branch: 'Рӯдакӣ', lateMinutes: 135, cameIn: true }, ...absent], 'day', 'tg');
    assert.ok(text.includes('• Алӣ (Рӯдакӣ) — 2 соат 15 дақ'));
    assert.ok(text.includes('Ба смена наомаданд (14):'));
    assert.match(text, /… ва боз 4$/);
  });

  it('филиали «Филиали санҷиш» савол дар бораи филиалҳоро намегирад', () => {
    assert.equal(parseQuestion('Кадом филиал беҳтар?', [...BRANCHES, { id: 9, name: 'Филиали санҷиш x1' }]).intent, 'branches');
  });

  it('рӯйхатҳои холӣ ва пур', () => {
    assert.match(lateReply([], 'day', 'tg'), /касе дер накард/);
    assert.match(lateReply([{ name: 'Алӣ', branch: 'Рӯдакӣ', lateMinutes: 15, cameIn: true }], 'day', 'tg'), /Дер омаданд — имрӯз \(1\):\n• Алӣ \(Рӯдакӣ\) — 15 дақиқа$/);
    assert.match(debtsReply([], true, 'tg'), /мӯҳлатгузашта нест/);
    assert.match(debtsReply([{ customer: 'Мадина', debt: 300, dueDate: '2026-10-20', daysOverdue: 12 }], false, 'tg'), /ҳамагӣ 300 сомонӣ[\s\S]*12 рӯз гузашт/);
    assert.match(stockReply([], 'ru'), /ничего не закончится/);
    assert.match(cashReply([{ branch: 'Рӯдакӣ', cashier: 'Ҷамшед', expectedCash: 1000, countedCash: 950, diff: -50 }], 'yesterday', 'tg'), /дирӯз[\s\S]*фарқ -50 сомонӣ ⚠️/);
  });
});
