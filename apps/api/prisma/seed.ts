// Маълумоти намунавӣ: 5 филиал, 1 шеф, 5 менеҷер, кормандон, меню ва 90 рӯз таърихи фурӯш.
// Иҷро: npm run db:seed   (ҳамаи маълумоти кӯҳна пок карда мешавад!)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, type Position } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DEMO_PASSWORD = 'demo1234';
const DAYS = 90;
const OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5

// Генератори тасодуфии такроршаванда, то ҳар дафъа ҳамон маълумот сохта шавад.
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

const BRANCHES = [
  { name: 'FilialHub Рӯдакӣ', city: 'Душанбе', address: 'хиёбони Рӯдакӣ 45', phone: '+992 37 221 1001', traffic: 1.35 },
  { name: 'FilialHub Сомонӣ', city: 'Душанбе', address: 'кӯчаи Исмоили Сомонӣ 12', phone: '+992 37 221 1002', traffic: 1.15 },
  { name: 'FilialHub Хуҷанд', city: 'Хуҷанд', address: 'кӯчаи Ленин 88', phone: '+992 34 222 2003', traffic: 1.0 },
  { name: 'FilialHub Бохтар', city: 'Бохтар', address: 'кӯчаи Айнӣ 5', phone: '+992 32 222 3004', traffic: 0.75 },
  { name: 'FilialHub Кӯлоб', city: 'Кӯлоб', address: 'кӯчаи Мир Саид Алии Ҳамадонӣ 21', phone: '+992 33 222 4005', traffic: 0.65 },
];

const PRODUCTS = [
  { name: 'Бургери классикӣ', category: 'Бургерҳо', emoji: '🍔', price: 32, cost: 13 },
  { name: 'Бургери дублӣ', category: 'Бургерҳо', emoji: '🍔', price: 45, cost: 19 },
  { name: 'Чизбургер', category: 'Бургерҳо', emoji: '🧀', price: 35, cost: 14 },
  { name: 'Твистер', category: 'Ролҳо', emoji: '🌯', price: 30, cost: 11 },
  { name: 'Шаурмаи мурғ', category: 'Ролҳо', emoji: '🥙', price: 28, cost: 10 },
  { name: 'Қаноти тунд (6 дона)', category: 'Мурғ', emoji: '🍗', price: 38, cost: 15 },
  { name: 'Стрипсҳо (5 дона)', category: 'Мурғ', emoji: '🍗', price: 36, cost: 14 },
  { name: 'Сатили мурғ (12 дона)', category: 'Мурғ', emoji: '🪣', price: 120, cost: 52 },
  { name: 'Наггетсҳо (9 дона)', category: 'Мурғ', emoji: '🍤', price: 27, cost: 9 },
  { name: 'Картошкаи фри', category: 'Газакҳо', emoji: '🍟', price: 14, cost: 4 },
  { name: 'Картошкаи деҳқонӣ', category: 'Газакҳо', emoji: '🥔', price: 16, cost: 5 },
  { name: 'Салати Сезар', category: 'Газакҳо', emoji: '🥗', price: 26, cost: 10 },
  { name: 'Кока-Кола 0.5', category: 'Нӯшокиҳо', emoji: '🥤', price: 10, cost: 4 },
  { name: 'Чойи сабз', category: 'Нӯшокиҳо', emoji: '🍵', price: 8, cost: 1.5 },
  { name: 'Милкшейк', category: 'Нӯшокиҳо', emoji: '🥛', price: 18, cost: 6 },
  { name: 'Яхмос', category: 'Ширинӣ', emoji: '🍦', price: 12, cost: 4 },
];

const FIRST = ['Фирдавс', 'Шаҳром', 'Меҳрубон', 'Сино', 'Далер', 'Ҷамшед', 'Парвиз', 'Бехрӯз', 'Рустам', 'Фаридун', 'Умед', 'Сорбон', 'Бахтиёр', 'Комрон', 'Манучеҳр'];
const FIRST_F = ['Мадина', 'Нилуфар', 'Зарина', 'Шаҳло', 'Гулноза', 'Малика', 'Фарангис', 'Сабрина', 'Дилноза', 'Тахмина'];
const LAST = ['Раҳимов', 'Назаров', 'Саидов', 'Каримов', 'Ҳасанов', 'Шарипов', 'Олимов', 'Юсуфов', 'Мирзоев', 'Давлатов', 'Қодиров', 'Азизов'];

const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', ғ: 'gh', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', ӣ: 'i', й: 'y', к: 'k', қ: 'q',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ӯ: 'u', ф: 'f', х: 'kh', ҳ: 'h', ч: 'ch', ҷ: 'j',
  ш: 'sh', ъ: '', э: 'e', ю: 'yu', я: 'ya',
};
const latin = (s: string) => [...s.toLowerCase()].map((c) => LATIN[c] ?? c).join('');

const CASHIERS_PER_BRANCH = 2;

const usedEmails = new Set<string>();
function makePerson(female = false) {
  const first = pick(female ? FIRST_F : FIRST);
  let last = pick(LAST);
  if (female) last = last + 'а';
  let email = `${latin(first)}.${latin(last)}@filialhub.tj`;
  for (let i = 2; usedEmails.has(email); i++) email = `${latin(first)}.${latin(last)}${i}@filialhub.tj`;
  usedEmails.add(email);
  const phone = `+992 ${pick(['90', '91', '92', '93', '98', '50', '55'])} ${int(100, 999)} ${int(1000, 9999)}`;
  return { fullName: `${first} ${last}`, email, phone };
}

/** Барои базаи кӯҳна: ба ҳар филиале, ки камтар аз 2 кассир дорад, кассир илова мекунад (такроран бехатар). */
async function ensureCashiers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const branches = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
  let added = 0;
  for (const b of branches) {
    const have = await prisma.user.count({ where: { branchId: b.id, position: 'CASHIER' } });
    for (let k = have; k < CASHIERS_PER_BRANCH; k++) {
      let p = makePerson(rand() > 0.5);
      while (await prisma.user.findUnique({ where: { email: p.email } })) p = makePerson(rand() > 0.5);
      await prisma.user.create({
        data: { ...p, passwordHash, role: 'STAFF', position: 'CASHIER', branchId: b.id, salary: 2000 + int(0, 6) * 100, hiredAt: new Date() },
      });
      added++;
    }
  }
  if (branches.length && !(await prisma.user.findUnique({ where: { email: 'cashier@filialhub.tj' } }))) {
    const c = await prisma.user.findFirst({ where: { branchId: branches[0].id, position: 'CASHIER' }, orderBy: { id: 'asc' } });
    if (c) await prisma.user.update({ where: { id: c.id }, data: { email: 'cashier@filialhub.tj' } });
  }
  if (added) console.log(`💵 ${added} кассир илова шуд`);
  await ensureDemoEmails(branches[0]?.id);
}

/** Ҳисобҳои демо барои ошпаз ва фаррош (агар набошанд) — барои санҷиши нақшҳо. */
async function ensureDemoEmails(branchId?: number) {
  if (!branchId) return;
  for (const [email, position] of [
    ['cook@filialhub.tj', 'COOK'],
    ['cleaner@filialhub.tj', 'CLEANER'],
  ] as const) {
    if (await prisma.user.findUnique({ where: { email } })) continue;
    const u = await prisma.user.findFirst({ where: { branchId, position }, orderBy: { id: 'asc' } });
    if (u) await prisma.user.update({ where: { id: u.id }, data: { email } });
  }
}

async function main() {
  // --if-empty: барои сервер (Render) — танҳо агар база холӣ бошад, маълумоти намунавӣ сохта мешавад.
  if (process.argv.includes('--if-empty') && (await prisma.user.count()) > 0) {
    console.log('✅ База аллакай маълумот дорад — seed лозим нест.');
    await ensureCashiers();
    return;
  }
  console.log('🧹 Пок кардани маълумоти кӯҳна…');
  // TRUNCATE ... RESTART IDENTITY — ID-ҳо ҳар дафъа аз 1 сар мешаванд.
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Alert", "AuditLog", "Expense", "Shift", "Task", "Notification", "OrderItem", "Order", "Customer", "User", "Product", "Branch" RESTART IDENTITY CASCADE',
  );

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = Date.now();

  console.log('🏪 Филиалҳо…');
  const branches = [];
  for (const [i, b] of BRANCHES.entries()) {
    const { traffic, ...data } = b;
    const branch = await prisma.branch.create({
      data: {
        ...data,
        email: `branch${i + 1}@filialhub.tj`,
        openedAt: new Date(now - int(400, 1500) * 86400000),
      },
    });
    branches.push({ ...branch, traffic });
  }

  console.log('👥 Кормандон…');
  const chef = await prisma.user.create({
    data: {
      fullName: 'Фирӯз Раҳимзода',
      email: 'chef@filialhub.tj',
      phone: '+992 90 000 0001',
      passwordHash,
      role: 'CHEF',
      salary: 0,
      hiredAt: new Date(now - 1600 * 86400000),
    },
  });

  const waitersByBranch = new Map<number, number[]>();
  const managerByBranch = new Map<number, number>();
  for (const [i, b] of branches.entries()) {
    const m = makePerson(i % 2 === 1);
    const manager = await prisma.user.create({
      data: {
        ...m,
        email: `manager${i + 1}@filialhub.tj`,
        passwordHash,
        role: 'MANAGER',
        branchId: b.id,
        salary: 4500,
        hiredAt: new Date(b.openedAt.getTime() + 86400000 * int(0, 30)),
      },
    });
    const staffPlan: [Position, number, number][] = [
      ['COOK', int(3, 4), 2600],
      ['WAITER', int(4, 6), 1800],
      ['CASHIER', CASHIERS_PER_BRANCH, 2000],
      ['CLEANER', 2, 1300],
    ];
    managerByBranch.set(b.id, manager.id);
    const waiterIds: number[] = [manager.id];
    for (const [position, count, salary] of staffPlan) {
      for (let k = 0; k < count; k++) {
        const p = makePerson(position !== 'COOK' && rand() > 0.5);
        const u = await prisma.user.create({
          data: {
            ...p,
            passwordHash,
            role: 'STAFF',
            position,
            branchId: b.id,
            salary: salary + int(0, 6) * 100,
            payDay: pick([1, 5, 10, 15, 25]),
            hiredAt: new Date(now - int(20, 600) * 86400000),
          },
        });
        // Таърихи фурӯш: пештар официантҳо ҳам сабт мекарданд; ҳоло танҳо кассир.
        if (position === 'WAITER' || position === 'CASHIER') waiterIds.push(u.id);
      }
    }
    waitersByBranch.set(b.id, waiterIds);
  }

  // Ҳисобҳои демо бо почтаи осон
  const demoWaiter = await prisma.user.findFirstOrThrow({ where: { branchId: branches[0].id, position: 'WAITER' } });
  await prisma.user.update({ where: { id: demoWaiter.id }, data: { email: 'waiter@filialhub.tj' } });
  const demoCashier = await prisma.user.findFirstOrThrow({ where: { branchId: branches[0].id, position: 'CASHIER' } });
  await prisma.user.update({ where: { id: demoCashier.id }, data: { email: 'cashier@filialhub.tj' } });
  await ensureDemoEmails(branches[0].id);

  console.log('🍔 Меню…');
  const products: Awaited<ReturnType<typeof prisma.product.create>>[] = [];
  for (const p of PRODUCTS) products.push(await prisma.product.create({ data: p }));
  // Маҳсулоти маъмул бештар фурӯхта мешаванд.
  const weights = products.map((p) => (p.category === 'Газакҳо' || p.category === 'Нӯшокиҳо' ? 3 : Number(p.price) > 100 ? 0.6 : 2));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedProduct = () => {
    let r = rand() * totalWeight;
    for (let i = 0; i < products.length; i++) if ((r -= weights[i]) <= 0) return products[i];
    return products[0];
  };

  console.log('🧑‍🤝‍🧑 Мизоҷон…');
  // Ҳар мизоҷ давраи фаъолият дорад; баъзеҳо 35+ рӯз пеш омаданро бас карданд («хоб рафта»).
  type SeedCustomer = { id: number; from: number; to: number; weight: number };
  const customersByBranch = new Map<number, SeedCustomer[]>();
  const usedPhones = new Set<string>();
  for (const b of branches) {
    const list: SeedCustomer[] = [];
    const n = Math.round(70 * b.traffic);
    for (let k = 0; k < n; k++) {
      const person = makePerson(rand() > 0.5);
      let phone = '';
      do phone = `+992${pick(['90', '91', '92', '93', '98', '50', '55', '77'])}${int(1000000, 9999999)}`;
      while (usedPhones.has(phone));
      usedPhones.add(phone);
      const bdOffset = k % 9 === 0 ? int(-1, 6) : int(10, 360); // чанд нафар зодрӯзашон наздик аст
      const bd = new Date(now + bdOffset * 86400000);
      bd.setUTCFullYear(int(1975, 2006));
      const c = await prisma.customer.create({
        data: {
          fullName: person.fullName,
          phone,
          email: rand() > 0.6 ? person.email.replace('@filialhub.tj', '@mail.tj') : null,
          birthday: rand() > 0.25 ? bd : null,
          branchId: b.id,
          note: rand() > 0.85 ? pick(['Тундро дӯст медорад', 'Бе пиёз', 'Ҳамеша бо оила меояд', 'Корти корпоративӣ']) : '',
          createdAt: new Date(now - int(1, DAYS) * 86400000),
        },
      });
      const from = int(0, DAYS - 1);
      const sleeping = rand() < 0.18;
      list.push({ id: c.id, from, to: sleeping ? Math.min(from, int(35, DAYS - 1)) : 0, weight: rand() < 0.15 ? 6 : rand() < 0.5 ? 2 : 1 });
    }
    customersByBranch.set(b.id, list);
  }

  console.log(`🧾 Фурӯш барои ${DAYS} рӯз…`);
  const todayLocal = new Date(now + OFFSET_MS);
  todayLocal.setUTCHours(0, 0, 0, 0);
  const todayStart = todayLocal.getTime() - OFFSET_MS;

  let orderCount = 0;
  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = todayStart - d * 86400000;
    const local = new Date(dayStart + OFFSET_MS);
    const weekend = [0, 5, 6].includes(local.getUTCDay()); // ҷумъа-якшанбе серодамтар
    const growth = 0.85 + ((DAYS - d) / DAYS) * 0.3; // тамоюли афзоиш

    for (const b of branches) {
      let count = Math.round(int(28, 46) * b.traffic * growth * (weekend ? 1.3 : 1));
      if (d === 0) {
        // Имрӯз — танҳо то соати ҷорӣ
        const hoursPassed = Math.max(0, (now - dayStart) / 3600000 - 9);
        count = Math.round((count * Math.min(hoursPassed, 14)) / 14);
      }
      const waiters = waitersByBranch.get(b.id)!;
      const eligible = customersByBranch.get(b.id)!.filter((c) => c.from >= d && c.to <= d);
      const eligibleWeight = eligible.reduce((a, c) => a + c.weight, 0);
      const pickCustomer = () => {
        let r = rand() * eligibleWeight;
        for (const c of eligible) if ((r -= c.weight) <= 0) return c.id;
        return eligible[0]?.id;
      };
      const orders: { data: Parameters<typeof prisma.order.create>[0]['data'] }[] = [];
      for (let k = 0; k < count; k++) {
        const hour = 9 + Math.floor(Math.pow(rand(), 0.8) * 14); // 09:00–23:00
        const createdAt = new Date(dayStart + hour * 3600000 + int(0, 3599) * 1000);
        if (createdAt.getTime() > now) continue;
        const lineCount = int(1, 4);
        const map = new Map<number, number>();
        for (let l = 0; l < lineCount; l++) {
          const p = weightedProduct();
          map.set(p.id, (map.get(p.id) ?? 0) + int(1, 2));
        }
        const items = [...map.entries()].map(([productId, qty]) => {
          const p = products.find((x) => x.id === productId)!;
          return { productId, qty, unitPrice: p.price, unitCost: p.cost };
        });
        const total = items.reduce((s, i) => s + Number(i.unitPrice) * i.qty, 0);
        const totalCost = items.reduce((s, i) => s + Number(i.unitCost) * i.qty, 0);
        const customerId = eligible.length && rand() < 0.42 ? pickCustomer() : undefined;
        orders.push({
          data: {
            branchId: b.id,
            userId: pick(waiters),
            createdAt,
            payment: rand() > 0.45 ? 'CARD' : 'CASH',
            total,
            totalCost,
            customerId,
            pointsEarned: customerId ? Math.floor(total * 0.05) : 0,
            items: { create: items },
          },
        });
      }
      await prisma.$transaction(orders.map((o) => prisma.order.create(o)));
      orderCount += orders.length;
    }
    if (d % 10 === 0) process.stdout.write(`  …${DAYS - d}/${DAYS} рӯз\n`);
  }

  await seedCrm({ branches, chefId: chef.id, managerByBranch, now, todayStart });

  console.log(`\n✅ Тайёр! ${branches.length} филиал, ${await prisma.user.count()} корманд, ${orderCount} фармоиш.`);
  console.log('\nҲисобҳои демо (парол: demo1234):');
  console.log('  👑 Шеф:      chef@filialhub.tj');
  console.log('  🧑‍💼 Менеҷер:  manager1@filialhub.tj … manager5@filialhub.tj');
  console.log('  🧑‍💼 Официант: waiter@filialhub.tj');
  console.log('  💵 Кассир:   cashier@filialhub.tj');
  console.log('  👨‍🍳 Ошпаз:    cook@filialhub.tj');
  console.log('  🧹 Фаррош:   cleaner@filialhub.tj');
}

// ---------- CRM: бонусҳо, смена, хароҷот, вазифаҳо, таърих ----------

async function seedCrm(ctx: {
  branches: { id: number; name: string; traffic: number }[];
  chefId: number;
  managerByBranch: Map<number, number>;
  now: number;
  todayStart: number;
}) {
  const { branches, chefId, managerByBranch, now, todayStart } = ctx;
  const DAY = 86400000;
  const H = 3600000;

  console.log('🎁 Ҳисоби бонусҳо…');
  await prisma.$executeRawUnsafe(`
    UPDATE "Customer" c SET
      "visits" = s.visits, "totalSpent" = s.spent, "lastVisitAt" = s.last, "points" = s.points
    FROM (
      SELECT "customerId", COUNT(*)::int AS visits, SUM("total") AS spent, MAX("createdAt") AS last,
             (SUM("pointsEarned") - SUM("pointsUsed"))::int AS points
      FROM "Order" WHERE "customerId" IS NOT NULL GROUP BY "customerId"
    ) s WHERE s."customerId" = c.id`);

  console.log('🗓 Смена ва давомот…');
  const localDow = (new Date(todayStart + OFFSET_MS).getUTCDay() + 6) % 7;
  const weekStart = todayStart - localDow * DAY;
  const staff = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'STAFF'] }, isActive: true } });
  const shifts: { userId: number; branchId: number; startsAt: Date; endsAt: Date; checkInAt: Date | null; checkOutAt: Date | null }[] = [];
  for (const u of staff) {
    const evening = rand() > 0.5;
    const offDays = new Set([int(0, 6), int(0, 6)]);
    for (let day = -7; day < 7; day++) {
      if (offDays.has((day + 14) % 7)) continue;
      const dayStart = weekStart + day * DAY;
      const startH = u.role === 'MANAGER' ? 10 : evening ? 15 : 9;
      const startsAt = dayStart + startH * H;
      const endsAt = startsAt + (u.role === 'MANAGER' ? 9 : 8) * H;
      let checkInAt: Date | null = null;
      let checkOutAt: Date | null = null;
      const roll = rand();
      if (roll > 0.04) {
        const lateMin = roll < 0.16 ? int(12, 45) : int(-12, 6);
        const ci = startsAt + lateMin * 60000;
        if (ci <= now) checkInAt = new Date(ci);
        const co = endsAt + int(-10, 25) * 60000;
        if (checkInAt && co <= now) checkOutAt = new Date(co);
      }
      shifts.push({ userId: u.id, branchId: u.branchId!, startsAt: new Date(startsAt), endsAt: new Date(endsAt), checkInAt, checkOutAt });
    }
  }
  await prisma.shift.createMany({ data: shifts });

  console.log('💸 Хароҷот…');
  const salaries = await prisma.user.groupBy({ by: ['branchId'], where: { isActive: true, role: { in: ['MANAGER', 'STAFF'] } }, _sum: { salary: true } });
  const expenses: { branchId: number; category: 'RENT' | 'SALARY' | 'UTILITIES' | 'SUPPLIES' | 'MARKETING' | 'OTHER'; amount: number; date: Date; note: string; createdById: number }[] = [];
  const nowLocal = new Date(now + OFFSET_MS);
  for (const b of branches) {
    const mgr = managerByBranch.get(b.id)!;
    const salary = salaries.find((s) => s.branchId === b.id)?._sum.salary ?? 0;
    // Танҳо моҳҳое, ки таърихи фурӯш пурра дорад (90 рӯз ≈ 3 моҳ).
    for (let m = 2; m >= 0; m--) {
      const y = nowLocal.getUTCFullYear();
      const mon = nowLocal.getUTCMonth() - m;
      const at = (day: number, hour = 12) => new Date(Date.UTC(y, mon, day, hour) - OFFSET_MS);
      const push = (category: (typeof expenses)[number]['category'], amount: number, date: Date, note: string, by = mgr) => {
        if (date.getTime() <= now) expenses.push({ branchId: b.id, category, amount: Math.round(amount), date, note, createdById: by });
      };
      push('RENT', 9000 * b.traffic, at(1, 10), 'Иҷораи моҳона', chefId);
      push('UTILITIES', int(1400, 2600) * b.traffic, at(15), 'Барқ, об, газ');
      push('MARKETING', int(400, 1600), at(int(5, 20)), pick(['Instagram реклама', 'Флаерҳо', 'Баннер']), chefId);
      for (const d of [3, 10, 17, 24]) push('SUPPLIES', int(700, 1200) * b.traffic, at(d, 9), pick(['Қуттӣ ва халтаҳо', 'Равған ва адвия', 'Маводи тозакунӣ']));
      push('SALARY', salary, at(28, 18), 'Маоши кормандон', chefId);
      if (rand() > 0.6) push('OTHER', int(300, 1500), at(int(2, 26)), pick(['Таъмири яхдон', 'Хариди курсӣ', 'Хизмати бонк']));
    }
  }
  await prisma.expense.createMany({ data: expenses });

  console.log('📋 Вазифаҳо…');
  const TASKS: [string, string, 'LOW' | 'MEDIUM' | 'HIGH'][] = [
    ['Тоза кардани фритюр', 'Равғанро иваз кунед ва фритюрро пурра тоза кунед', 'HIGH'],
    ['Санҷиши санитарӣ', 'Ошхона ва анборро барои санҷиши SES тайёр кунед', 'HIGH'],
    ['Инвентаризатсияи анбор', 'Маҳсулоти мондаро ҳисоб карда ба менеҷер фиристед', 'MEDIUM'],
    ['Шустани тирезаҳо', 'Тирезаҳои толори асосӣ', 'LOW'],
    ['Омӯзиши менюи нав', 'Бургери дублӣ ва салати Сезарро омӯзед', 'MEDIUM'],
    ['Тоза кардани ҳоҷатхонаҳо', 'Ҳар 2 соат санҷед', 'MEDIUM'],
    ['Қабули маҳсулот', 'Мурғ ва картошка соати 8:00 мерасад', 'HIGH'],
    ['Тайёр кардани толор барои ид', 'Ороиш ва мизҳои иловагӣ', 'LOW'],
    ['Таъмири касса', 'Принтери чек кор намекунад — устоҳоро даъват кунед', 'HIGH'],
    ['Санҷиши яхдонҳо', 'Ҳароратро сабт кунед (≤ 4°C)', 'MEDIUM'],
  ];
  const tasks = [];
  for (const b of branches) {
    const people = staff.filter((u) => u.branchId === b.id && u.role === 'STAFF');
    const mgr = managerByBranch.get(b.id)!;
    for (let k = 0; k < 7; k++) {
      const [title, description, priority] = TASKS[(k + b.id * 3) % TASKS.length];
      const pos = title.includes('Тоза') || title.includes('Шуст') ? 'CLEANER' : title.includes('фритюр') || title.includes('менюи') || title.includes('Қабул') ? 'COOK' : undefined;
      const pool = pos ? people.filter((p) => p.position === pos) : people;
      const status = k < 3 ? 'TODO' : k < 5 ? 'IN_PROGRESS' : 'DONE';
      const createdAt = new Date(now - int(1, 9) * DAY);
      tasks.push({
        title,
        description,
        priority,
        status: status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        branchId: b.id,
        assigneeId: pick(pool.length ? pool : people).id,
        createdById: rand() > 0.3 ? mgr : chefId,
        dueDate: k === 0 ? new Date(now - DAY) : new Date(todayStart + int(0, 6) * DAY + 18 * H),
        completedAt: status === 'DONE' ? new Date(now - int(1, 48) * H) : null,
        createdAt,
      });
    }
  }
  await prisma.task.createMany({ data: tasks });
  // Вазифаҳо барои официанти демо
  const waiter = await prisma.user.findUniqueOrThrow({ where: { email: 'waiter@filialhub.tj' } });
  await prisma.task.createMany({
    data: [
      { title: 'Пешниҳоди корти бонус ба мизоҷон', description: 'Ба ҳар мизоҷ гӯед, ки бо рақами телефон бонус ҷамъ мекунад', priority: 'MEDIUM', status: 'TODO', branchId: waiter.branchId, assigneeId: waiter.id, createdById: managerByBranch.get(waiter.branchId!)!, dueDate: new Date(todayStart + 2 * DAY) },
      { title: 'Тайёр кардани мизҳо барои банкет', description: 'Шанбе соати 18:00, 20 нафар', priority: 'HIGH', status: 'IN_PROGRESS', branchId: waiter.branchId, assigneeId: waiter.id, createdById: managerByBranch.get(waiter.branchId!)!, dueDate: new Date(todayStart + 3 * DAY) },
    ],
  });

  console.log('🕓 Таърихи амалҳо ва огоҳиномаҳо…');
  const products = await prisma.product.findMany({ take: 4 });
  const audit = [
    ...products.map((p, i) => ({ userId: chefId, action: 'UPDATE', entity: 'product', entityId: p.id, summary: `${p.emoji} ${p.name}: нарх: ${Number(p.price) - 2} → ${Number(p.price)}`, createdAt: new Date(now - (i + 2) * DAY) })),
    ...branches.map((b, i) => ({ userId: chefId, action: 'UPDATE', entity: 'branch', entityId: b.id, branchId: b.id, summary: `Филиал тағйир ёфт: ${b.name}`, createdAt: new Date(now - (i + 8) * DAY) })),
    ...branches.map((b, i) => ({ userId: managerByBranch.get(b.id)!, action: 'CREATE', entity: 'task', branchId: b.id, summary: 'Вазифаи нав: «Инвентаризатсияи анбор»', createdAt: new Date(now - (i + 1) * 5 * H) })),
  ];
  await prisma.auditLog.createMany({ data: audit });

  const managerIds = [...managerByBranch.values()];
  await prisma.alert.createMany({
    data: [
      { userId: chefId, icon: '📊', title: 'Ҳисоботи дирӯза тайёр аст', body: 'Фурӯш ва фоидаи ҳамаи филиалҳо', link: '/dashboard', createdAt: new Date(now - 10 * H) },
      { userId: chefId, icon: '🎂', title: 'Зодрӯзи мизоҷон дар ин ҳафта', body: 'Ба мизоҷони VIP табрик фиристед', link: '/customers', createdAt: new Date(now - 3 * H) },
      ...managerIds.map((id) => ({ userId: id, icon: '✅', title: 'Вазифа иҷро шуд: Санҷиши яхдонҳо', body: 'Корманд вазифаро тайёр кард', link: '/tasks', createdAt: new Date(now - 2 * H) })),
      ...managerIds.map((id) => ({ userId: id, icon: '⏰', title: 'Корманд дер омад', body: '18 дақиқа дер', link: '/schedule', createdAt: new Date(now - 5 * H) })),
      { userId: waiter.id, icon: '🔥', title: 'Вазифаи нав: Тайёр кардани мизҳо барои банкет', body: 'Менеҷер ба шумо вазифа дод', link: '/tasks', createdAt: new Date(now - H) },
    ],
  });
  console.log(`  ${await prisma.customer.count()} мизоҷ, ${shifts.length} смена, ${expenses.length} хароҷот, ${tasks.length + 2} вазифа`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
