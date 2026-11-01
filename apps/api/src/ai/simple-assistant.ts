import type { BranchRank, PeriodStats, ProductRank } from '@filialhub/shared';

/**
 * Ёрдамчии ройгон (бе AI): вақте ки ANTHROPIC_API_KEY нест, саволро аз рӯи калимаҳо мефаҳмем
 * ва ҷавобро аз ҳамон асбобҳои ёрдамчии AI (бо ҳамон ҳуқуқҳо) месозем. Рақамҳо — танҳо аз база.
 * Тоҷикӣ (кириллӣ ва лотинӣ) ва русӣ.
 */

export type Intent = 'sales' | 'branches' | 'products' | 'late' | 'debts' | 'stock' | 'cash' | 'help';
export type When = 'day' | 'yesterday' | 'week' | 'month';
export type Lang = 'tg' | 'ru';

export interface Parsed {
  intent: Intent;
  when: When;
  branchId: number | null;
  overdueOnly: boolean;
  lang: Lang;
}

const FOLD: Record<string, string> = { ӣ: 'и', ӯ: 'у', ҳ: 'х', ҷ: 'ч', қ: 'к', ғ: 'г', ё: 'е', ъ: '' };

/** Ҳарфҳои тоҷикӣ → русӣ, бе аломатҳо: «Фурӯши имрӯз?» → «фуруши имруз» */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[ӣӯҳҷқғёъ]/g, (c) => FOLD[c])
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Решаҳои калимаҳо: калимаи савол бо яке аз инҳо сар шавад — мувофиқ аст
const WORDS = {
  sales: ['фуруш', 'фурухт', 'продаж', 'продал', 'выручк', 'фоида', 'прибыл', 'даромад', 'доход', 'харочот', 'расход', 'чек', 'furush', 'furuxt', 'furukht', 'foida', 'daromad', 'sales', 'revenue', 'profit'],
  branch: ['филиал', 'filial', 'branch', 'точк'],
  product: ['мол', 'махсулот', 'товар', 'продукт', 'блюд', 'таом', 'menu', 'меню', 'mol', 'mahsulot', 'maxsulot', 'tovar'],
  late: ['дер', 'опозд', 'наомад', 'давомот', 'посещ', 'прогул', 'der', 'naomad', 'davomot', 'late'],
  debts: ['карз', 'долг', 'должн', 'насия', 'qarz', 'karz', 'debt'],
  stock: ['тамом', 'анбор', 'склад', 'запас', 'остат', 'заканч', 'конча', 'кам', 'tamom', 'anbor', 'stock'],
  cash: ['касс', 'kass', 'cash', 'недостач', 'фарк', 'farq'],
  overdue: ['мухлат', 'просроч', 'гузашт', 'срок', 'muhlat', 'overdue'],
  day: ['имруз', 'сегодня', 'imruz', 'imroz', 'today'],
  yesterday: ['дируз', 'вчера', 'diruz', 'yesterday'],
  week: ['хафта', 'недел', 'hafta', 'week'],
  month: ['мох', 'месяц', 'moh', 'month'],
};
// Калимаҳое, ки танҳо дар русӣ ҳастанд — ҷавоб ба русӣ
const RU = ['сегодня', 'вчера', 'продаж', 'выручк', 'прибыл', 'кто', 'сколько', 'какой', 'какие', 'какая', 'долг', 'должн', 'недел', 'месяц', 'склад', 'товар', 'лучш', 'опозд'];

const has = (tokens: string[], stems: string[]) => tokens.some((t) => stems.some((s) => t.startsWith(s)));
const KEYWORDS = Object.values(WORDS).flat();

/** Филиал аз рӯи ном: калимае, ки танҳо дар номи ҳамин филиал ҳаст («FilialHub Рӯдакӣ» → «рудаки») */
function findBranch(tokens: string[], branches: { id: number; name: string }[]) {
  const words = branches.map((b) => normalize(b.name).split(' ').filter((w) => w.length >= 4));
  const count = new Map<string, number>();
  for (const ws of words) for (const w of new Set(ws)) count.set(w, (count.get(w) ?? 0) + 1);
  for (const [i, ws] of words.entries()) {
    // «Филиали санҷиш» — калимаи «филиал» ном нест; калимаҳои савол (фурӯш, филиал, касса…) ҳисоб намешаванд
    const own = ws.filter((w) => count.get(w) === 1 && !has([w], KEYWORDS));
    // охири калима метавонад иваз шавад: «Рӯдакӣ» → «Рӯдакиро»
    if (own.some((w) => tokens.some((t) => t.startsWith(w.slice(0, Math.max(4, w.length - 2)))))) return branches[i].id;
  }
  return null;
}

export function parseQuestion(text: string, branches: { id: number; name: string }[] = []): Parsed {
  const norm = normalize(text);
  const tokens = norm.split(' ').filter(Boolean);
  const lang: Lang = /[ыэщ]/.test(text.toLowerCase()) || has(tokens, RU) ? 'ru' : 'tg';
  const branchId = findBranch(tokens, branches);
  const when: When = has(tokens, WORDS.yesterday) ? 'yesterday' : has(tokens, WORDS.week) ? 'week' : has(tokens, WORDS.month) ? 'month' : 'day';
  const overdueOnly = has(tokens, WORDS.overdue) || norm.includes('сари вакт') || norm.includes('в срок');

  let intent: Intent = 'help';
  if (has(tokens, WORDS.debts)) intent = 'debts';
  else if (has(tokens, WORDS.late)) intent = 'late';
  else if (has(tokens, WORDS.cash)) intent = 'cash';
  else if (has(tokens, WORDS.stock)) intent = 'stock';
  else if (has(tokens, WORDS.product)) intent = 'products';
  else if (has(tokens, WORDS.branch) && branchId === null) intent = 'branches';
  else if (has(tokens, WORDS.sales) || branchId !== null) intent = 'sales';
  return { intent, when, branchId, overdueOnly, lang };
}

// ---------- Ҷавобҳо ----------

const T = {
  tg: {
    when: { day: 'имрӯз', yesterday: 'дирӯз', week: 'ин ҳафта', month: 'ин моҳ' },
    som: 'сомонӣ',
    all: 'ҳамаи филиалҳо',
  },
  ru: {
    when: { day: 'сегодня', yesterday: 'вчера', week: 'на этой неделе', month: 'в этом месяце' },
    som: 'сомони',
    all: 'все филиалы',
  },
} as const;

const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const money = (n: number, lang: Lang) => `${num(n)} ${T[lang].som}`;

export function salesReply(s: PeriodStats, when: When, branch: string | null, lang: Lang) {
  const where = branch ?? T[lang].all;
  const w = T[lang].when[when];
  if (!s.orders) return lang === 'ru' ? `📊 ${w[0].toUpperCase() + w.slice(1)} (${where}) продаж нет.` : `📊 ${w[0].toUpperCase() + w.slice(1)} (${where}) фурӯш нест.`;
  const rows =
    lang === 'ru'
      ? [`Выручка: ${money(s.revenue, lang)}`, `Прибыль: ${money(s.profit, lang)}`, `Расходы: ${money(s.expenses, lang)}`, `Чистая прибыль: ${money(s.netProfit, lang)}`, `Заказов: ${s.orders}`, `Средний чек: ${money(s.avgCheck, lang)}`]
      : [`Фурӯш: ${money(s.revenue, lang)}`, `Фоида: ${money(s.profit, lang)}`, `Хароҷот: ${money(s.expenses, lang)}`, `Фоидаи соф: ${money(s.netProfit, lang)}`, `Фармоишҳо: ${s.orders}`, `Чеки миёна: ${money(s.avgCheck, lang)}`];
  return `📊 ${lang === 'ru' ? 'Продажи' : 'Фурӯш'} — ${w} (${where}):\n${rows.map((r) => `• ${r}`).join('\n')}`;
}

export function branchesReply(rows: BranchRank[], when: When, lang: Lang) {
  const w = T[lang].when[when];
  const list = [...rows].sort((a, b) => b.revenue - a.revenue).filter((r) => r.orders > 0);
  if (!list.length) return lang === 'ru' ? `🏆 ${w}: продаж по филиалам нет.` : `🏆 ${w}: дар филиалҳо фурӯш нест.`;
  const head = lang === 'ru' ? `🏆 Филиалы — ${w}:` : `🏆 Филиалҳо — ${w}:`;
  const p = lang === 'ru' ? 'прибыль' : 'фоида';
  return `${head}\n${list.map((r, i) => `${i + 1}. ${r.name} — ${money(r.revenue, lang)} (${p} ${money(r.profit, lang)})`).join('\n')}`;
}

export function productsReply(rows: ProductRank[], when: When, lang: Lang) {
  const w = T[lang].when[when];
  if (!rows.length) return lang === 'ru' ? `🥇 ${w}: продаж товаров нет.` : `🥇 ${w}: мол фурӯхта нашуд.`;
  const head = lang === 'ru' ? `🥇 Лучшие товары — ${w}:` : `🥇 Молҳои беҳтарин — ${w}:`;
  const pcs = lang === 'ru' ? 'шт' : 'дона';
  return `${head}\n${rows.map((r, i) => `${i + 1}. ${r.emoji.startsWith('icon:') ? '' : `${r.emoji} `}${r.name} — ${num(r.qty)} ${pcs}, ${money(r.revenue, lang)}`).join('\n')}`;
}

/** 45 → «45 дақиқа», 135 → «2 соат 15 дақ» */
const dur = (min: number, lang: Lang) => {
  if (min < 60) return lang === 'ru' ? `${min} мин` : `${min} дақиқа`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return lang === 'ru' ? `${h} ч${m ? ` ${m} мин` : ''}` : `${h} соат${m ? ` ${m} дақ` : ''}`;
};

/** Рӯйхати дароз кӯтоҳ мешавад: аввалин `max` сатр ва «боз N» */
const cut = (lines: string[], max: number, lang: Lang) =>
  lines.length > max ? [...lines.slice(0, max), lang === 'ru' ? `… и ещё ${lines.length - max}` : `… ва боз ${lines.length - max}`] : lines;

export function lateReply(rows: { name: string; branch: string; lateMinutes: number; cameIn: boolean }[], when: When, lang: Lang) {
  const w = T[lang].when[when === 'yesterday' ? 'yesterday' : 'day'];
  if (!rows.length) return lang === 'ru' ? `✅ ${w[0].toUpperCase() + w.slice(1)} никто не опоздал.` : `✅ ${w[0].toUpperCase() + w.slice(1)} касе дер накард.`;
  const late = rows.filter((r) => r.cameIn).sort((a, b) => b.lateMinutes - a.lateMinutes);
  const absent = rows.filter((r) => !r.cameIn);
  const parts: string[] = [];
  if (late.length) {
    parts.push(lang === 'ru' ? `⏰ Опоздали — ${w} (${late.length}):` : `⏰ Дер омаданд — ${w} (${late.length}):`);
    parts.push(...cut(late.map((r) => `• ${r.name} (${r.branch}) — ${dur(r.lateMinutes, lang)}`), 10, lang));
  }
  if (absent.length) {
    parts.push(lang === 'ru' ? `🚫 Не пришли на смену (${absent.length}):` : `🚫 Ба смена наомаданд (${absent.length}):`);
    parts.push(...cut(absent.map((r) => `• ${r.name} (${r.branch})`), 10, lang));
  }
  return parts.join('\n');
}

export function debtsReply(rows: { customer: string; debt: number; dueDate: string | null; daysOverdue: number }[], overdueOnly: boolean, lang: Lang) {
  if (!rows.length)
    return lang === 'ru' ? (overdueOnly ? '✅ Просроченных долгов нет.' : '✅ Должников нет.') : overdueOnly ? '✅ Қарзи мӯҳлатгузашта нест.' : '✅ Қарздор нест.';
  const total = rows.reduce((s, r) => s + r.debt, 0);
  const head =
    lang === 'ru'
      ? `💳 ${overdueOnly ? 'Просроченные долги' : 'Должники'} (${rows.length}), всего ${money(total, lang)}:`
      : `💳 ${overdueOnly ? 'Қарзҳои мӯҳлатгузашта' : 'Қарздорон'} (${rows.length}), ҳамагӣ ${money(total, lang)}:`;
  const line = (r: (typeof rows)[number]) => {
    const due = r.dueDate ? (lang === 'ru' ? `, срок ${r.dueDate}` : `, мӯҳлат ${r.dueDate}`) : '';
    const late = r.daysOverdue > 0 ? (lang === 'ru' ? ` (просрочено ${r.daysOverdue} дн.)` : ` (${r.daysOverdue} рӯз гузашт)`) : '';
    return `• ${r.customer} — ${money(r.debt, lang)}${due}${late}`;
  };
  return `${head}\n${rows.slice(0, 10).map(line).join('\n')}`;
}

export function stockReply(rows: { product: string; branch: string; unit: string; left: number; daysLeft: number | null; suggestedOrder: number | null }[], lang: Lang) {
  if (!rows.length) return lang === 'ru' ? '✅ Товара хватает — за 7 дней ничего не закончится.' : '✅ Мол кофист — дар 7 рӯз чизе тамом намешавад.';
  const head = lang === 'ru' ? `📦 Заканчивается (${rows.length}):` : `📦 Кам монд (${rows.length}):`;
  const line = (r: (typeof rows)[number]) => {
    const days = r.daysLeft !== null ? (lang === 'ru' ? `, ~${r.daysLeft} дн.` : `, ~${r.daysLeft} рӯз`) : '';
    const order = r.suggestedOrder ? (lang === 'ru' ? `; заказать ${num(r.suggestedOrder)} ${r.unit}` : `; фармоиш: ${num(r.suggestedOrder)} ${r.unit}`) : '';
    return `• ${r.product} (${r.branch}) — ${lang === 'ru' ? 'осталось' : 'монд'} ${num(r.left)} ${r.unit}${days}${order}`;
  };
  return `${head}\n${rows.slice(0, 15).map(line).join('\n')}`;
}

export function cashReply(rows: { branch: string; cashier: string; expectedCash: number; countedCash: number; diff: number }[], when: When, lang: Lang) {
  const w = T[lang].when[when === 'yesterday' ? 'yesterday' : 'day'];
  if (!rows.length) return lang === 'ru' ? `💵 ${w[0].toUpperCase() + w.slice(1)} кассу не закрывали.` : `💵 ${w[0].toUpperCase() + w.slice(1)} касса пӯшида нашудааст.`;
  const head = lang === 'ru' ? `💵 Касса — ${w}:` : `💵 Касса — ${w}:`;
  const line = (r: (typeof rows)[number]) => {
    const diff = r.diff === 0 ? '✅ 0' : `${r.diff > 0 ? '+' : ''}${money(r.diff, lang)} ⚠️`;
    return lang === 'ru'
      ? `• ${r.branch}, ${r.cashier} — ожидалось ${money(r.expectedCash, lang)}, посчитано ${money(r.countedCash, lang)}, разница ${diff}`
      : `• ${r.branch}, ${r.cashier} — интизор ${money(r.expectedCash, lang)}, ҳисобшуда ${money(r.countedCash, lang)}, фарқ ${diff}`;
  };
  return `${head}\n${rows.map(line).join('\n')}`;
}

export function helpReply(lang: Lang) {
  return lang === 'ru'
    ? 'Я простой помощник (без AI) и отвечаю на такие вопросы:\n• продажи и прибыль (сегодня / вчера / неделя / месяц)\n• какой филиал лучше\n• лучшие товары\n• кто опоздал\n• должники\n• что заканчивается на складе\n• касса\nНапример: «продажи за неделю» или «кто вчера опоздал».'
    : 'Ман ёрдамчии оддӣ (бе AI) ҳастам ва ба ин саволҳо ҷавоб медиҳам:\n• фурӯш ва фоида (имрӯз / дирӯз / ҳафта / моҳ)\n• кадом филиал беҳтар\n• молҳои беҳтарин\n• кӣ дер монд\n• қарздорон\n• чӣ тамом мешавад\n• касса\nМасалан: «фурӯши ин ҳафта» ё «кӣ дирӯз дер монд».';
}
