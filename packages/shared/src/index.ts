// Умумӣ барои web ва api: нақшҳо, вазифаҳо, номҳои тоҷикӣ ва типҳои ҷавобҳои API.

export const ROLES = ['CHEF', 'MANAGER', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

export const POSITIONS = ['COOK', 'WAITER', 'CASHIER', 'CLEANER', 'SELLER', 'STOREKEEPER'] as const;
export type Position = (typeof POSITIONS)[number];

// ---------- Навъи кор (ширкат) ----------

/** Ҳар ширкат (соҳибкор) навъи кори худро дорад: тарабхона, мағозаи хӯрокворӣ, либос, сантехника… */
export const BUSINESS_TYPES = ['RESTAURANT', 'GROCERY', 'CLOTHING', 'PLUMBING', 'ELECTRONICS', 'PHARMACY', 'BUILDING', 'OTHER'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  RESTAURANT: 'Тарабхона / кафе',
  GROCERY: 'Мағозаи хӯрокворӣ',
  CLOTHING: 'Мағозаи либос',
  PLUMBING: 'Мағозаи сантехника',
  ELECTRONICS: 'Мағозаи техника',
  PHARMACY: 'Дорухона',
  BUILDING: 'Маводи сохтмонӣ',
  OTHER: 'Дигар',
};

export const BUSINESS_TYPE_EMOJI: Record<BusinessType, string> = {
  RESTAURANT: '🍔',
  GROCERY: '🛒',
  CLOTHING: '👕',
  PLUMBING: '🚰',
  ELECTRONICS: '📱',
  PHARMACY: '💊',
  BUILDING: '🧱',
  OTHER: '🏪',
};

export function isRestaurant(type: BusinessType | null | undefined): boolean {
  return type === 'RESTAURANT';
}

/** Вазифаҳои кормандон аз рӯи навъи кор */
export function positionsFor(type: BusinessType | null | undefined): readonly Position[] {
  return isRestaurant(type) ? ['COOK', 'WAITER', 'CASHIER', 'CLEANER'] : ['SELLER', 'CASHIER', 'STOREKEEPER', 'CLEANER'];
}

/** Номи саҳифаи маҳсулот: «Меню» барои тарабхона, «Маҳсулот» барои мағоза */
export function catalogLabel(type: BusinessType | null | undefined): string {
  return isRestaurant(type) ? 'Меню' : 'Маҳсулот';
}

/** Воҳидҳои ченак барои маҳсулот */
export const UNITS = ['дона', 'кг', 'грамм', 'литр', 'метр', 'м²', 'қуттӣ', 'ҷуфт', 'халта', 'порция'] as const;

/** Воҳидҳое, ки бо миқдори касрӣ фурӯхта мешаванд (1,5 кг, 2,3 метр) */
export function isFractionalUnit(unit: string | null | undefined): boolean {
  return ['кг', 'литр', 'метр', 'м²'].includes((unit ?? '').trim());
}

export function defaultUnit(type: BusinessType | null | undefined): string {
  return isRestaurant(type) ? 'порция' : 'дона';
}

/** Категорияҳои пешниҳодшуда барои маҳсулот (корбар метавонад категорияи худро ҳам нависад) */
export const SUGGESTED_CATEGORIES: Record<BusinessType, readonly string[]> = {
  RESTAURANT: ['Таомҳо', 'Бургерҳо', 'Нӯшокиҳо', 'Ширинӣ', 'Газакҳо'],
  GROCERY: ['Нон ва орд', 'Шир ва панир', 'Гӯшт', 'Мева ва сабзавот', 'Нӯшокиҳо', 'Ширинӣ', 'Хоҷагӣ'],
  CLOTHING: ['Мардона', 'Занона', 'Кӯдакона', 'Пойафзол', 'Аксессуарҳо'],
  PLUMBING: ['Қубурҳо', 'Кран ва смеситель', 'Унитаз ва раковина', 'Душ ва ванна', 'Фитингҳо', 'Асбобҳо'],
  ELECTRONICS: ['Телефонҳо', 'Ноутбукҳо', 'Телевизорҳо', 'Аксессуарҳо', 'Техникаи хонагӣ'],
  PHARMACY: ['Доруҳо', 'Витаминҳо', 'Гигиена', 'Тиббӣ'],
  BUILDING: ['Семент ва гаҷ', 'Ранг', 'Асбобҳо', 'Барқ', 'Тахта ва фанер'],
  OTHER: ['Умумӣ'],
};

/** Иконкаи пешфарзи маҳсулот (номи иконкаи Lucide; дар база "icon:Номи") */
export const DEFAULT_PRODUCT_EMOJI: Record<BusinessType, string> = {
  RESTAURANT: 'icon:Hamburger',
  GROCERY: 'icon:Apple',
  CLOTHING: 'icon:Shirt',
  PLUMBING: 'icon:Droplets',
  ELECTRONICS: 'icon:Smartphone',
  PHARMACY: 'icon:Pill',
  BUILDING: 'icon:BrickWall',
  OTHER: 'icon:Package',
};

export interface Organization {
  id: number;
  name: string;
  type: BusinessType;
  /** Тавсиф барои мизоҷони бозори онлайн */
  description: string;
  /** Дар бозори онлайн нишон дода мешавад */
  isPublic: boolean;
  /** Бизнес танҳо пас аз тасдиқи супер-админ (APPROVED) кор мекунад */
  status: OrgStatus;
  /** Сабаби рад ё бастан */
  statusNote: string;
  /** Кассир то ин қарзи умумии мизоҷ бе тасдиқи менеҷер ба қарз мефурӯшад (0 — ҳамеша тасдиқ) */
  cashierDebtLimit: number;
  /** Тарифи пардохтшуда (ё FREE) */
  plan: Plan;
  /** Тариф то ин сана; null — бемӯҳлат (ё FREE) */
  planUntil: string | null;
  createdAt: string;
}

// ---------- Тарифҳо ва пардохт ----------

export const PLANS = ['FREE', 'START', 'BUSINESS', 'PRO', 'ENTERPRISE'] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanInfo {
  id: Plan;
  name: string;
  /** Нарх дар як моҳ (сомонӣ) */
  price: number;
  /** null — бемаҳдуд */
  branches: number | null;
  /** Кормандон бе шеф; null — бемаҳдуд */
  employees: number | null;
  /** Барои кӣ */
  tagline: string;
  /** Тарифе, ки бештар интихоб мекунанд */
  popular?: boolean;
}

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  FREE: { id: 'FREE', name: 'Озмоишӣ', price: 0, branches: 1, employees: 4, tagline: 'Барои санҷиш — ҳамеша ройгон' },
  START: { id: 'START', name: 'Старт', price: 150, branches: 2, employees: 10, tagline: 'Мағоза ё қаҳвахонаи хурд' },
  BUSINESS: { id: 'BUSINESS', name: 'Бизнес', price: 290, branches: 5, employees: 30, tagline: 'Шабакаи хурди филиалҳо', popular: true },
  PRO: { id: 'PRO', name: 'Про', price: 490, branches: 15, employees: 100, tagline: 'Шабакаи калон' },
  ENTERPRISE: { id: 'ENTERPRISE', name: 'Корпоративӣ', price: 890, branches: null, employees: null, tagline: 'Бемаҳдуд + ёрии шахсӣ' },
};

/** Тарифҳое, ки харидан мумкин аст */
export const PAID_PLANS = PLANS.filter((p) => p !== 'FREE') as Exclude<Plan, 'FREE'>[];

/** Барои чанд моҳ пардохт кардан мумкин аст ва тахфиф (%) */
export const BILLING_PERIODS = [1, 3, 6, 12] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];
export const PERIOD_DISCOUNT: Record<BillingPeriod, number> = { 1: 0, 3: 5, 6: 10, 12: 20 };

/** Пас аз тамом шудани тариф чанд рӯз маҳдудиятҳо ҳанӯз кушодаанд */
export const PLAN_GRACE_DAYS = 3;

/** Маблағи пардохт барои тариф ва мӯҳлат (сомонӣ, бутун) */
export function planPrice(plan: Plan, months: BillingPeriod): number {
  return Math.round((PLAN_INFO[plan].price * months * (100 - PERIOD_DISCOUNT[months])) / 100);
}

/** Тарифе, ки ҳоло амал мекунад: пас аз мӯҳлат (ва рӯзҳои имтиёзӣ) — FREE */
export function effectivePlan(o: { plan: string; planUntil: string | Date | null }, now = new Date()): Plan {
  const plan = (PLANS as readonly string[]).includes(o.plan) ? (o.plan as Plan) : 'FREE';
  if (plan === 'FREE' || !o.planUntil) return plan;
  return new Date(o.planUntil).getTime() + PLAN_GRACE_DAYS * 86400000 > now.getTime() ? plan : 'FREE';
}

export const PLAN_PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type PlanPaymentStatus = (typeof PLAN_PAYMENT_STATUSES)[number];

export const PLAN_PAYMENT_STATUS_LABELS: Record<PlanPaymentStatus, string> = {
  PENDING: 'Санҷида мешавад',
  APPROVED: 'Қабул шуд',
  REJECTED: 'Рад шуд',
  CANCELLED: 'Бекор шуд',
};

/** Дархости «Ман пул фиристодам» */
export interface PlanPayment {
  id: number;
  organizationId: number;
  organizationName: string;
  plan: Plan;
  months: number;
  amount: number;
  /** Рақами чек, 4 рақами охири корт ё телефони фиристанда */
  reference: string;
  status: PlanPaymentStatus;
  /** Сабаби рад */
  note: string;
  createdAt: string;
  decidedAt: string | null;
  /** Барои супер-админ: соҳиби бизнес */
  owner?: { fullName: string; phone: string; email: string } | null;
}

/** Ба кадом корт пул фиристода шавад (супер-админ дар /admin танзим мекунад) */
export interface PaymentCard {
  number: string;
  holder: string;
  bank: string;
  /** Телефон барои саволҳо ё пардохт бо рақам */
  phone: string;
  /** Иловагӣ: масалан «Alif Mobi, DC Wallet низ мешавад» */
  note: string;
}

export interface BillingInfo {
  plan: Plan;
  /** Тарифе, ки ҳоло амал мекунад (пас аз мӯҳлат — FREE) */
  effective: Plan;
  planUntil: string | null;
  /** Чанд рӯз монд; null — бемӯҳлат */
  daysLeft: number | null;
  usage: { branches: number; employees: number };
  limits: { branches: number | null; employees: number | null };
  pending: PlanPayment | null;
  history: PlanPayment[];
  card: PaymentCard;
  /** Ҳисоби демо — пардохт лозим нест */
  isDemo: boolean;
}

// ---------- Супер-админ: тасдиқи бизнесҳо ----------

export const ORG_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  PENDING: 'Интизори тасдиқ',
  APPROVED: 'Тасдиқшуда',
  REJECTED: 'Радшуда',
  BLOCKED: 'Басташуда',
};

/** Бизнес дар рӯйхати супер-админ */
export interface AdminBusiness {
  id: number;
  name: string;
  type: BusinessType;
  description: string;
  status: OrgStatus;
  statusNote: string;
  createdAt: string;
  reviewedAt: string | null;
  owner: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'whatsapp' | 'telegram' | 'telegramLinked'> | null;
  branches: number;
  employees: number;
  products: number;
  /** Дигар бизнесҳои ҳамин соҳиб */
  ownerBusinesses: number;
  plan: Plan;
  planUntil: string | null;
}

export interface AdminBusinessDetail extends AdminBusiness {
  branchList: (Branch & { staffCount: number })[];
  staff: User[];
}

export interface AdminOverview {
  businesses: number;
  pending: number;
  approved: number;
  rejected: number;
  blocked: number;
  branches: number;
  employees: number;
  clients: number;
  /** Пардохтҳои интизори санҷиш */
  pendingPayments: number;
  /** Бизнесҳое, ки ҳоло тарифи пулакӣ доранд */
  paying: number;
  /** Даромади ин моҳ (пардохтҳои қабулшуда, сомонӣ) */
  revenueMonth: number;
}

/** Тарзҳои пардохт дар POS; DEBT — ба қарз (ба дафтари қарзи мизоҷ) */
export const PAYMENTS = ['CASH', 'CARD', 'DEBT'] as const;
export type Payment = (typeof PAYMENTS)[number];
/** Мизоҷи онлайн ба қарз харида наметавонад */
export const ONLINE_PAYMENTS = ['CASH', 'CARD'] as const;

export const ROLE_LABELS: Record<Role, string> = {
  CHEF: 'Шеф',
  MANAGER: 'Менеҷер',
  STAFF: 'Корманд',
};

export const POSITION_LABELS: Record<Position, string> = {
  COOK: 'Ошпаз',
  WAITER: 'Официант',
  CASHIER: 'Кассир',
  CLEANER: 'Фаррош',
  SELLER: 'Фурӯшанда',
  STOREKEEPER: 'Анбордор',
};

export const POSITION_EMOJI: Record<Position, string> = {
  COOK: '👨‍🍳',
  WAITER: '🧑‍💼',
  CASHIER: '💵',
  CLEANER: '🧹',
  SELLER: '🛍️',
  STOREKEEPER: '📦',
};

/** Вазифаҳое, ки фурӯш (POS) сабт карда метавонанд. */
export const SELLER_POSITIONS: readonly Position[] = ['CASHIER', 'SELLER'];

/** Шеф, менеҷер ва кассир фурӯш сабт карда метавонанд. */
export function canSell(u: { role: Role; position: Position | null }): boolean {
  return u.role !== 'STAFF' || (u.position !== null && SELLER_POSITIONS.includes(u.position));
}

// ---------- Дастрасӣ ба саҳифаҳо (ягона барои web ва api) ----------

export const FEATURES = [
  'dashboard',
  'branches',
  'staff',
  'customers',
  'tasks',
  'schedule',
  'messages',
  'pos',
  'sales',
  'products',
  'expenses',
  'integrations',
  'audit',
  'alerts',
  'search',
  /** Қабули занг (ҳама); занг задан — танҳо онҳое, ки «messages» доранд */
  'calls',
  'profile',
  /** Фармоишҳои онлайни мизоҷон */
  'online',
  /** Дафтари қарз: кӣ чанд қарздор аст, пардохт ва ёдрас */
  'debts',
  /** Ёрдамчии AI: саволҳо дар бораи фурӯш, кормандон, қарз ва анбор (шеф ва менеҷер) */
  'assistant',
  /** Панели супер-админ: тасдиқи бизнесҳо, ҳамаи филиалҳо ва кормандон */
  'admin',
  /** Тариф ва пардохт (танҳо шеф) */
  'billing',
] as const;
export type Feature = (typeof FEATURES)[number];

/**
 * Корманд танҳо ин саҳифаҳоро мебинад:
 * кассир — фурӯш (POS + сабад), таърихи фурӯш, профил; официант — меню, профил;
 * ошпаз ва фаррош — профил (бо маош ва рӯзи гирифтани он).
 * Ҳама: «Ҷадвали ман» (Омадам / Рафтам), вазифаҳои худ ва чат бо менеҷер ва шеф — API онҳоро ба худи корманд маҳдуд мекунад.
 */
export const STAFF_FEATURES: Record<Position, readonly Feature[]> = {
  CASHIER: ['pos', 'sales', 'online', 'debts', 'profile', 'calls', 'schedule', 'tasks', 'messages', 'alerts'],
  WAITER: ['products', 'profile', 'calls', 'schedule', 'tasks', 'messages', 'alerts'],
  COOK: ['profile', 'calls', 'schedule', 'tasks', 'messages', 'alerts'],
  CLEANER: ['profile', 'calls', 'schedule', 'tasks', 'messages', 'alerts'],
  // Мағоза: фурӯшанда мол мефурӯшад ва рӯйхати молро мебинад; анбордор — рӯйхати мол
  SELLER: ['pos', 'sales', 'online', 'debts', 'products', 'profile', 'calls', 'schedule', 'tasks', 'messages', 'alerts'],
  STOREKEEPER: ['products', 'profile', 'calls', 'schedule', 'tasks', 'messages', 'alerts'],
};

type Who = { role: Role; position: Position | null; isSuperAdmin?: boolean };

export function canAccess(u: Who, feature: Feature): boolean {
  if (feature === 'admin') return !!u.isSuperAdmin;
  if (u.role === 'CHEF') return true;
  if (u.role === 'MANAGER') return feature !== 'integrations' && feature !== 'audit' && feature !== 'billing';
  return !!u.position && STAFF_FEATURES[u.position].includes(feature);
}

/** Саҳифаи аввал пас аз воридшавӣ */
export function homePath(u: Who): string {
  if (u.isSuperAdmin) return '/admin';
  if (u.role !== 'STAFF') return '/dashboard';
  if (u.position === 'CASHIER' || u.position === 'SELLER') return '/pos';
  if (u.position === 'STOREKEEPER') return '/warehouse';
  if (u.position === 'WAITER') return '/products';
  return '/profile';
}

/** Кадом саҳифа ба кадом имконият тааллуқ дорад (барои ҳимояи роҳҳо дар web) */
export function featureOfPath(pathname: string): Feature | null {
  const seg = pathname.split('/')[1] ?? '';
  const map: Record<string, Feature> = {
    dashboard: 'dashboard',
    branches: 'branches',
    staff: 'staff',
    customers: 'customers',
    tasks: 'tasks',
    schedule: 'schedule',
    messages: 'messages',
    pos: 'pos',
    sales: 'sales',
    products: 'products',
    warehouse: 'products',
    suppliers: 'products',
    expenses: 'expenses',
    integrations: 'integrations',
    audit: 'audit',
    profile: 'profile',
    online: 'online',
    debts: 'debts',
    assistant: 'assistant',
    promos: 'customers',
    payroll: 'staff',
    admin: 'admin',
    billing: 'billing',
  };
  return map[seg] ?? null;
}

/** Рӯзи гирифтани маош: санаи навбатӣ (рӯзи payDay-и моҳ; агар моҳ кӯтоҳ бошад — рӯзи охир) */
export function nextPayDate(payDay: number, from: Date = new Date()): Date {
  const at = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(Math.max(payDay, 1), last));
  };
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisMonth = at(today.getFullYear(), today.getMonth());
  return thisMonth >= today ? thisMonth : at(today.getFullYear(), today.getMonth() + 1);
}

export const PAYMENT_LABELS: Record<Payment, string> = {
  CASH: 'Нақд',
  CARD: 'Корт',
  DEBT: 'Қарз',
};

export const CURRENCY = 'сомонӣ';

export function formatMoney(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${CURRENCY}`;
}

/** Рақами телефонро ба шакли байналмилалӣ (танҳо рақамҳо) табдил медиҳад: +992 90 123 4567 → 992901234567 */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function whatsappLink(phone: string, text?: string): string {
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${phoneDigits(phone)}${q}`;
}

/**
 * Майдони Telegram: @номи_корбар, t.me/номи_корбар ё рақами телефон (на почта!).
 * Ҳам барои атрибути pattern дар браузер, ҳам барои санҷиш дар сервер.
 */
export const TELEGRAM_PATTERN = String.raw`@?[A-Za-z][A-Za-z0-9_]{3,31}|(https?:\/\/)?t\.me\/[A-Za-z][A-Za-z0-9_]{3,31}|\+?[0-9 \(\)\-]{7,20}`;

export const TELEGRAM_RE = new RegExp(`^(?:${TELEGRAM_PATTERN})?$`);

/** Номи корбарии Telegram-ро ба шакли ягона меорад: «@Name», «t.me/Name» → «Name» */
export function normalizeTelegram(value: string): string {
  return value
    .trim()
    .replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, '')
    .replace(/^@/, '');
}

/** Telegram: номи корбарӣ (@name ё t.me/name) ё рақами телефон; text — матни омода (барои номи корбарӣ) */
export function telegramLink(value: string, text?: string): string {
  const v = normalizeTelegram(value);
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  if (/^[a-zA-Z][a-zA-Z0-9_]{3,}$/.test(v)) return `https://t.me/${v}${q}`;
  return `https://t.me/+${phoneDigits(v)}`;
}

// ---------- Типҳои API ----------

export interface Branch {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  openedAt: string;
  isActive: boolean;
  manager?: Pick<User, 'id' | 'fullName' | 'phone' | 'email' | 'whatsapp' | 'telegram'> | null;
  staffCount?: number;
  staffByPosition?: Record<Position, number>;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  /** Рақами WhatsApp; холӣ — phone */
  whatsapp: string;
  /** Telegram: номи корбарӣ ё рақам; холӣ — phone */
  telegram: string;
  role: Role;
  position: Position | null;
  branchId: number | null;
  branch?: Pick<Branch, 'id' | 'name' | 'city'> | null;
  salary: number;
  /** Рӯзи моҳ, ки маош дода мешавад (1–28) */
  payDay: number;
  hiredAt: string;
  isActive: boolean;
  telegramLinked: boolean;
  /** Супер-админи платформа */
  isSuperAdmin: boolean;
  /** Ширкате, ки корбар дар он кор мекунад */
  organization?: Organization | null;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  emoji: string;
  /** Воҳиди ченак: дона, кг, литр, метр… */
  unit: string;
  /** Тавсифи кӯтоҳ барои мағозаи онлайн */
  description: string;
  price: number;
  cost: number;
  profit: number;
  margin: number;
  /** Штрих-код (агар бошад) */
  barcode: string | null;
  /** Акс: /api/images/{imageId} */
  imageId: number | null;
  /** Боқимонда дар анбор; null — ҳисоб карда намешавад */
  stock: number | null;
  /** Ҳадди огоҳӣ (кам мондан) */
  lowStock: number | null;
  /**
   * Боқимонда дар ҳар филиал (stock — ҷамъи онҳо). reserved — банд дар фармоишҳои онлайни ҳанӯз нарасонида;
   * касса танҳо qty − reserved-ро фурӯхта метавонад.
   */
  branchStock: { branchId: number; qty: number; reserved?: number }[];
  isActive: boolean;
}

export interface OrderItem {
  productId: number;
  name: string;
  emoji: string;
  /** Воҳиди ченак (дона, кг…) */
  unit: string;
  /** Касрӣ ҳам мешавад (1,5 кг) */
  qty: number;
  unitPrice: number;
  unitCost: number;
  /** Чанд аз ин мол аллакай баргардонида шуд (возврат) */
  returned?: number;
}

export interface Order {
  id: number;
  branchId: number;
  branchName: string;
  userName: string;
  createdAt: string;
  total: number;
  totalCost: number;
  profit: number;
  payment: Payment;
  customerId: number | null;
  customerName: string | null;
  discount: number;
  pointsEarned: number;
  pointsUsed: number;
  /** Коди тахфиф, агар истифода шуда бошад */
  promoCode: string | null;
  items: OrderItem[];
  /** Возврат: чеки манфӣ ба фурӯши №returnOfId (total ва qty манфӣ) */
  returnOfId: number | null;
  /** Сабаби возврат */
  note: string;
  /** Барои фурӯши аслӣ: чанд сомонӣ аллакай баргардонида шуд */
  refunded: number;
}

/** Натиҷаи возврат: чек ва пули нақде, ки ба мизоҷ дода мешавад (қарз аввал кам мешавад) */
export interface ReturnResult {
  order: Order;
  /** Ба мизоҷ ба ҳамон тарзи пардохт (нақд/корт) баргардонед */
  cashBack: number;
  /** Чанд аз қарзи мизоҷ кам шуд */
  debtReduced: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PeriodStats {
  revenue: number;
  cost: number;
  /** Фоидаи умумӣ = фурӯш − арзиши аслӣ */
  profit: number;
  expenses: number;
  /** Фоидаи соф = фоида − хароҷот */
  netProfit: number;
  orders: number;
  avgCheck: number;
}

export interface Overview {
  today: PeriodStats;
  yesterday: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  branches: number;
  employees: number;
  employeesByPosition: Record<Position, number>;
  managers: number;
}

export interface TimePoint {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface BranchRank {
  branchId: number;
  name: string;
  city: string;
  revenue: number;
  profit: number;
  expenses: number;
  netProfit: number;
  orders: number;
  employees: number;
}

export interface ProductRank {
  productId: number;
  name: string;
  emoji: string;
  qty: number;
  revenue: number;
  profit: number;
}

export type Period = 'day' | 'week' | 'month';

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'Имрӯз',
  week: 'Ҳафта',
  month: 'Моҳ',
};

/** Профил → Бизнеси ман → WhatsApp-и худи бизнес (Green-API) */
export interface BusinessWhatsApp {
  /** Бизнес рақами худашро пайваст кардааст */
  own: boolean;
  idInstance: string;
  apiUrl: string;
  mediaUrl: string;
  /** Токен захира шудааст (худи токен ба браузер намеояд) */
  tokenSet: boolean;
  /** authorized | notAuthorized | … */
  state: string | null;
  error: string | null;
  /** Рақами умумии FilialHub кор мекунад */
  platform: boolean;
  /** Сервер instance-ро худаш месозад — соҳиб танҳо QR-ро скан мекунад */
  autoAvailable: boolean;
}

export interface IntegrationStatus {
  telegram: {
    configured: boolean;
    botUsername: string | null;
    linkedUsers: number;
    /** webhook — дар сервер (бот ҳамеша ҷавоб медиҳад), polling — дар компютер */
    mode: 'webhook' | 'polling' | 'off';
    lastError: string | null;
    /** Паёмҳое, ки Telegram ҳанӯз ба сервер нарасондааст */
    pendingUpdates: number;
  };
  whatsapp: {
    configured: boolean;
    /** greenapi — WhatsApp-и оддӣ бо QR (бе Facebook); meta — WhatsApp Cloud API */
    provider: 'greenapi' | 'meta' | null;
    /** Green-API: authorized — пайваст; notAuthorized — QR-ро скан кунед */
    state: string | null;
    /** Номи шаблон барои паём пас аз 24 соат */
    template: string | null;
    /** Webhook (ҷавобҳо аз WhatsApp ба сайт) танзим шудааст */
    webhook: boolean;
    lastError: string | null;
  };
  dailyReportCron: string;
}

// ---------- CRM ----------

/** 5% аз маблағи пардохтшуда ба бонус меравад; 1 балл = 1 сомонӣ */
export const POINTS_RATE = 0.05;

export const SEGMENTS = ['VIP', 'REGULAR', 'NEW', 'SLEEPING'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  VIP: 'VIP',
  REGULAR: 'Доимӣ',
  NEW: 'Нав',
  SLEEPING: 'Хоб рафта',
};

export const SEGMENT_HINTS: Record<Segment, string> = {
  VIP: 'Харид аз 1500 сомонӣ ё 15+ ташриф',
  REGULAR: '3+ ташриф',
  NEW: 'То 3 ташриф',
  SLEEPING: '30+ рӯз наомадааст',
};

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  branchId: number | null;
  branchName: string | null;
  points: number;
  totalSpent: number;
  visits: number;
  avgCheck: number;
  lastVisitAt: string | null;
  note: string;
  segment: Segment;
  /** Қарзи ҳозира (0 — қарз нест) */
  debt: number;
  /** Мӯҳлати пардохти қарз (YYYY-MM-DD) ё null */
  debtDueAt: string | null;
  /** Ҳадди қарз (null — бе ҳад) */
  creditLimit: number | null;
  createdAt: string;
}

/** Як сатр дар дафтари қарз: мусбат — ба қарз гирифт, манфӣ — пардохт кард */
export interface DebtEntry {
  id: number;
  amount: number;
  payment: Payment | null;
  note: string;
  orderId: number | null;
  userName: string | null;
  /** Мӯҳлати пардохт (YYYY-MM-DD) — барои қарзи нав */
  dueAt: string | null;
  createdAt: string;
}

/** Коди тахфиф / аксия */
export interface PromoCode {
  id: number;
  code: string;
  percent: number | null;
  amount: number | null;
  minTotal: number;
  /** 1 = душанбе … 7 = якшанбе; холӣ — ҳар рӯз */
  weekdays: number[];
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  uses: number;
  pos: boolean;
  online: boolean;
  isActive: boolean;
}

/** Натиҷаи санҷиши код барои сабад */
export interface PromoCheck {
  code: string;
  discount: number;
  /** «−10%» ё «−20 сомонӣ» */
  label: string;
}

export const WEEKDAY_SHORT = ['Дш', 'Сш', 'Чш', 'Пш', 'Ҷм', 'Шб', 'Яш'] as const;

export interface DebtSummary {
  /** Ҷамъи қарзи ҳамаи мизоҷон */
  total: number;
  debtors: number;
  /** WhatsApp-и бизнес пайваст аст — ёдрасҳо ба мизоҷ мераванд */
  whatsapp: boolean;
  /** Номи боти Telegram (мизоҷ рақамашро мефиристад ва хабарҳоро дар Telegram мегирад) */
  telegramBot: string | null;
  /** Дархостҳои қарз, ки интизори тасдиқанд (дар доираи дастрасии корбар) */
  pendingRequests: number;
  /** Қарзҳое, ки мӯҳлаташон гузаштааст: шумора ва ҷамъ */
  overdue: number;
  overdueTotal: number;
}

export type DebtRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Дархости қарз аз кассир — то тасдиқи менеҷер қарз дода намешавад */
export interface DebtRequest {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  /** Қарзи ҳозираи мизоҷ (пеш аз ин дархост) */
  customerDebt: number;
  branchName: string;
  amount: number;
  note: string;
  /** Фурӯш аз POS (мол пас аз тасдиқ дода мешавад) */
  items: { name: string; qty: number }[] | null;
  status: DebtRequestStatus;
  requestedBy: string | null;
  decidedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
  /** Фурӯше, ки пас аз тасдиқ сабт шуд */
  orderId: number | null;
  /** Мӯҳлати пардохт (YYYY-MM-DD) */
  dueAt: string | null;
}

/** Қарзи мизоҷи онлайн дар мағозаҳо (тавассути Telegram-и тасдиқшуда) */
export interface ClientDebts {
  /** Telegram пайваст аст — бе он рақами телефон тасдиқ нашудааст ва қарз нишон дода намешавад */
  linked: boolean;
  items: { store: string; debt: number; dueAt: string | null }[];
}

export interface CustomerStats {
  total: number;
  bySegment: Record<Segment, number>;
  newThisMonth: number;
  pointsOutstanding: number;
  birthdaysThisWeek: Pick<Customer, 'id' | 'fullName' | 'phone' | 'birthday'>[];
}

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Нав',
  IN_PROGRESS: 'Дар раванд',
  DONE: 'Тайёр',
};

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Паст',
  MEDIUM: 'Миёна',
  HIGH: 'Фаврӣ',
};

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  branchId: number | null;
  branchName: string | null;
  assignee: Pick<User, 'id' | 'fullName' | 'position' | 'role'> | null;
  createdBy: Pick<User, 'id' | 'fullName'> | null;
  completedAt: string | null;
  createdAt: string;
  overdue: boolean;
}

/** Агар корманд аз оғози смена зиёда аз ин дақиқаҳо дер ояд — «дер омад» */
export const LATE_MINUTES = 10;

export type ShiftState = 'PLANNED' | 'ON_SHIFT' | 'DONE' | 'LATE' | 'ABSENT';
export const SHIFT_STATE_LABELS: Record<ShiftState, string> = {
  PLANNED: 'Нақшавӣ',
  ON_SHIFT: 'Дар кор',
  DONE: 'Тамом шуд',
  LATE: 'Дер омад',
  ABSENT: 'Наомад',
};

export interface Shift {
  id: number;
  userId: number;
  userName: string;
  position: Position | null;
  role: Role;
  branchId: number;
  branchName: string;
  startsAt: string;
  endsAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  /** Чанд дақиқа пеш аз оғози смена омад (0 — на барвақт) */
  earlyMinutes: number;
  hoursWorked: number;
  state: ShiftState;
}

export const STOCK_REASON_LABELS: Record<StockMove['reason'], string> = {
  SALE: 'Фурӯш',
  ONLINE: 'Фармоиши онлайн',
  PURCHASE: 'Харид',
  ADJUST: 'Ҳисоби дастӣ',
  WRITE_OFF: 'Хориҷ',
  RETURN: 'Возврат',
  TRANSFER_OUT: 'Интиқол (рафт)',
  TRANSFER_IN: 'Интиқол (омад)',
  STOCKTAKE: 'Инвентаризатсия',
};

/** Таҳлили мол дар N рӯз: чӣ намефурӯшад (пул дар раф хобидааст) ва чӣ фоида намедиҳад */
export interface ProductInsight {
  productId: number;
  name: string;
  emoji: string;
  unit: string;
  price: number;
  cost: number;
  /** Маржа, % аз нарх */
  margin: number;
  /** Фурӯш дар давра (бе возвратҳо) */
  soldQty: number;
  revenue: number;
  profit: number;
  /** Боқимонда ва арзиши он бо нархи аслӣ (null — ҳисоб карда намешавад) */
  stock: number | null;
  stockValue: number;
  lastSoldAt: string | null;
  /** Чанд рӯз боқимонда бо суръати ҳозираи фурӯш мерасад (null — фурӯш нест) */
  daysOfStock: number | null;
  /** dead — дар раф ҳаст, вале фурӯш нест; slow — зиёда аз 90 рӯз мерасад; loss — нарх ≤ арзиш; low — маржа < 15% */
  flags: ('dead' | 'slow' | 'loss' | 'low')[];
}

export interface ProductInsights {
  days: number;
  items: ProductInsight[];
  /** Пули «хобида»: арзиши моли мурда ва суст */
  frozen: number;
  dead: number;
  slow: number;
  loss: number;
  low: number;
}

/** Таъминкунанда: қарзи мо ба ӯ ва ҷамъи харидҳо */
export interface Supplier {
  id: number;
  name: string;
  phone: string;
  note: string;
  /** Қарзи мо ба ӯ (+ мо қарздорем) */
  debt: number;
  /** Ҷамъи харидҳо аз «Қабули мол» (миқдор × нархи харид) */
  purchased: number;
  lastPurchaseAt: string | null;
}

export interface SupplierEntry {
  id: number;
  /** + харид ба қарз, − пардохти мо */
  amount: number;
  payment: Payment | null;
  note: string;
  userName: string | null;
  createdAt: string;
}

export interface SupplierDetail {
  supplier: Supplier;
  entries: SupplierEntry[];
  purchases: { id: number; productName: string; unit: string; qty: number; unitCost: number | null; branchName: string; createdAt: string }[];
}

/** Натиҷаи инвентаризатсия: ҳар мол ва ҷамъи камомад/зиёдатӣ бо нархи аслӣ */
export interface StocktakeResult {
  lines: { productId: number; name: string; unit: string; before: number; counted: number; diff: number; value: number }[];
  /** Ҷамъи камомад (манфӣ) ва зиёдатӣ бо арзиши аслӣ */
  shortage: number;
  surplus: number;
}

/** Рӯйхати харид: моле, ки дар филиал кам монд ё тамом шуд */
export interface ReorderItem {
  productId: number;
  name: string;
  emoji: string;
  unit: string;
  branchId: number;
  branchName: string;
  qty: number;
  lowStock: number;
  /** Чанд харидан лозим: то 2 × ҳадди «кам монд» (камаш 1) */
  suggested: number;
  lastSupplier: string | null;
  lastUnitCost: number | null;
}

/** Як сатр дар таърихи анбор */
export interface StockMove {
  id: number;
  branchName: string;
  /** + омад, − рафт */
  qty: number;
  /** Боқимондаи филиал пас аз тағйир */
  balance: number;
  reason: 'SALE' | 'ONLINE' | 'PURCHASE' | 'ADJUST' | 'WRITE_OFF' | 'RETURN' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'STOCKTAKE';
  supplier: string;
  unitCost: number | null;
  orderId: number | null;
  note: string;
  userName: string | null;
  createdAt: string;
  /** Дар таърихи умумии анбор (на таърихи як мол) */
  product?: { id: number; name: string; emoji: string; unit: string };
}

/** Z-ҳисобот: фурӯш ва пули як кассир дар як рӯз */
export interface CashReport {
  userId: number;
  userName: string;
  branchName: string;
  orders: number;
  cashSales: number;
  cardSales: number;
  debtSales: number;
  discounts: number;
  /** Пардохти қарз, ки ҳамин кас қабул кард */
  debtPaidCash: number;
  debtPaidCard: number;
  /** Возвратҳое, ки ҳамин кас сабт кард: шумора ва маблағ аз рӯи тарзи пардохти чеки аслӣ */
  returns: number;
  refundCash: number;
  refundCard: number;
  refundDebt: number;
  /** Пуле, ки бояд дар касса бошад: фурӯши нақд + пардохти нақди қарз − возврати нақд */
  expectedCash: number;
  /** Агар касса пӯшида бошад */
  closing: { countedCash: number; diff: number; note: string; closedAt: string } | null;
}

export interface ZReport {
  /** «2026-10-31» */
  date: string;
  rows: CashReport[];
  totals: {
    orders: number;
    cashSales: number;
    cardSales: number;
    debtSales: number;
    debtPaidCash: number;
    debtPaidCard: number;
    returns: number;
    refundCash: number;
    refundCard: number;
    refundDebt: number;
    expectedCash: number;
    diff: number;
  };
}

/** Маош аз рӯи давомот: як корманд дар як моҳ */
export interface PayrollRow {
  userId: number;
  fullName: string;
  role: Role;
  position: Position | null;
  branchName: string | null;
  /** Маоши моҳона (аз профил) */
  salary: number;
  payDay: number;
  /** Сменаҳои ҷадвалшуда, ки вақташон расид (то имрӯз) */
  planned: number;
  /** Аз онҳо — омад */
  attended: number;
  /** Рӯзҳое, ки «Омадам» пахш кард (бо сменаҳои бе ҷадвал) */
  workedDays: number;
  hours: number;
  lateCount: number;
  lateMinutes: number;
  /** Сменаи ҷадвалшуда, ки наомад */
  absent: number;
  /** Маош × (омад / ҷадвал); бе ҷадвал — маоши пурра. Пешниҳод, на ҳисоби ниҳоӣ */
  suggestedPay: number;
}

export interface Payroll {
  /** «2026-10» */
  month: string;
  rows: PayrollRow[];
  totals: { salary: number; suggestedPay: number; hours: number; lateCount: number; absent: number };
}

export interface AttendanceSummary {
  date: string;
  planned: number;
  onShift: number;
  late: number;
  absent: number;
  done: number;
}

export const EXPENSE_CATEGORIES = ['RENT', 'SALARY', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  RENT: 'Иҷора',
  SALARY: 'Маош',
  UTILITIES: 'Коммуналӣ',
  SUPPLIES: 'Маҳсулот ва лавозимот',
  MARKETING: 'Реклама',
  OTHER: 'Дигар',
};
export const EXPENSE_EMOJI: Record<ExpenseCategory, string> = {
  RENT: '🏢',
  SALARY: '💼',
  UTILITIES: '💡',
  SUPPLIES: '📦',
  MARKETING: '📣',
  OTHER: '🧾',
};

export interface Expense {
  id: number;
  branchId: number;
  branchName: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ProfitAndLoss {
  month: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  byCategory: Record<ExpenseCategory, number>;
}

export interface AuditEntry {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: number | null;
  summary: string;
  userName: string | null;
  branchId: number | null;
  createdAt: string;
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  branch: 'Филиал',
  user: 'Корманд',
  product: 'Маҳсулот',
  customer: 'Мизоҷ',
  task: 'Вазифа',
  shift: 'Смена',
  expense: 'Хароҷот',
  promo: 'Аксия',
  organization: 'Ширкат',
  debtRequest: 'Дархости қарз',
  cash: 'Касса',
};

export interface Alert {
  id: number;
  icon: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SearchResult {
  type: 'user' | 'customer' | 'branch' | 'product';
  id: number;
  title: string;
  subtitle: string;
  href: string;
}

// ---------- Паёмҳо ----------

/** Хабарҳои фаврӣ аз /api/events: браузер дархости мувофиқро фавран такрор мекунад */
export type ServerEvent = 'messages' | 'calls' | 'alerts' | 'orders' | 'debts' | 'activity' | 'presence' | 'stock';

/** Чӣ кор мекунад ҳамсуҳбат (мисли WhatsApp/Telegram): «менависад…», «аудио сабт мекунад…» */
export const CHAT_ACTIVITIES = ['typing', 'recording', 'video', 'stop'] as const;
export type ChatActivityKind = (typeof CHAT_ACTIVITIES)[number];

/** Рӯйдоди «activity»: fromId ба шумо чизе менависад/сабт мекунад; «stop» — бас кард */
export interface ChatActivity {
  fromId: number;
  kind: ChatActivityKind;
}

/** Рӯйдоди «presence»: корбар сайтро кушод ё баст */
export interface Presence {
  userId: number;
  online: boolean;
  lastSeenAt: string | null;
}

export const CHANNELS = ['WHATSAPP', 'TELEGRAM'] as const;
export type Channel = (typeof CHANNELS)[number];

/** Натиҷаи фиристодан: SENT — рафт, DRY_RUN — токен нест (танҳо сабт шуд), FAILED — хато, NOT_LINKED — Telegram пайваст нест */
export type DeliveryStatus = 'SENT' | 'DRY_RUN' | 'FAILED' | 'NOT_LINKED';

export interface MessageRecipient {
  id: number;
  fullName: string;
  role: Role;
  position: Position | null;
  branchId: number | null;
  branchName: string | null;
  phone: string;
  whatsapp: string;
  telegram: string;
  telegramLinked: boolean;
}

export interface MessageRecipients {
  recipients: MessageRecipient[];
  /** Оё бот/API барои фиристодан аз сервер танзим шудааст */
  configured: { telegram: boolean; whatsapp: boolean };
}

export interface MessageResult {
  userId: number;
  fullName: string;
  channel: Channel;
  status: DeliveryStatus;
  error?: string;
}

export interface MessageLog {
  id: number;
  channel: Channel;
  to: string;
  status: DeliveryStatus;
  error: string | null;
  text: string;
  recipientId: number | null;
  recipientName: string | null;
  senderName: string | null;
  createdAt: string;
}

// ---------- Чат ----------

export type MessageSource = 'WEB' | 'TELEGRAM' | 'WHATSAPP';

/** TEXT — матн, VOICE — паёми овозӣ, VIDEO_NOTE — видеои мудаввар, CALL — сабти занг */
export type MessageKind = 'TEXT' | 'VOICE' | 'VIDEO_NOTE' | 'CALL';

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  text: string;
  kind: MessageKind;
  /** Чат дар кадом канал аст (null — занг ё паёми танҳо-сайт: дар ҳарду чат намоён) */
  channel: Channel | null;
  /** Файли овоз/видео: GET /messages/media/:mediaId */
  mediaId: number | null;
  mime: string | null;
  durationSec: number | null;
  source: MessageSource;
  whatsappStatus: DeliveryStatus | null;
  telegramStatus: DeliveryStatus | null;
  readAt: string | null;
  createdAt: string;
}

/** Маълумоти пурраи шахс барои тирезаи «Дар бораи корманд» дар чат */
export interface ContactInfo extends MessageRecipient {
  email: string;
  hiredAt: string;
  isActive: boolean;
  /** Танҳо барои шеф ва менеҷери ҳамон филиал */
  salary: number | null;
  payDay: number | null;
}

export interface ChatContact extends MessageRecipient {
  lastMessage: { text: string; createdAt: string; mine: boolean } | null;
  unread: number;
  /** Ҳоло сайт кушода аст */
  online: boolean;
  /** Охирин бор кай дар сайт буд (барои «дида шуд 14:30») */
  lastSeenAt: string | null;
}

// ---------- Занг (WebRTC) ----------

export type CallStatus = 'RINGING' | 'ACTIVE' | 'ENDED' | 'DECLINED' | 'MISSED' | 'CANCELLED';

export interface CallInfo {
  id: number;
  callerId: number;
  calleeId: number;
  callerName: string;
  calleeName: string;
  video: boolean;
  status: CallStatus;
  /** SDP-и пешниҳод (барои қабулкунанда) */
  offer: string | null;
  /** SDP-и ҷавоб (барои зангзананда) */
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
}

/** Агар дар ин муддат ҷавоб надиҳанд — «занги беҷавоб» */
export const CALL_RING_SECONDS = 45;

/** Маҳдудиятҳои паёмҳои овозӣ ва видеоӣ */
export const MEDIA_MAX_BYTES = 15 * 1024 * 1024;
export const VOICE_MAX_SECONDS = 300;
export const VIDEO_NOTE_MAX_SECONDS = 60;

export interface TelegramLinkInfo {
  configured: boolean;
  botUsername: string | null;
  /** https://t.me/<bot>?start=<код> — бо як пахш ҳисоб пайваст мешавад */
  link: string | null;
  linked: boolean;
}

// ---------- Бозори онлайн (мизоҷон) ----------

export const ONLINE_STATUSES = ['NEW', 'ACCEPTED', 'DELIVERING', 'DELIVERED', 'CANCELLED'] as const;
export type OnlineOrderStatus = (typeof ONLINE_STATUSES)[number];

export const ONLINE_STATUS_LABELS: Record<OnlineOrderStatus, string> = {
  NEW: 'Нав',
  ACCEPTED: 'Қабул шуд',
  DELIVERING: 'Дар роҳ',
  DELIVERED: 'Гирифта шуд',
  CANCELLED: 'Бекор шуд',
};

export const ONLINE_STATUS_EMOJI: Record<OnlineOrderStatus, string> = {
  NEW: '🆕',
  ACCEPTED: '👨‍🍳',
  DELIVERING: '🛵',
  DELIVERED: '✅',
  CANCELLED: '✖️',
};

/** Ҳолати навбатӣ, ки корманд метавонад гузорад */
export const ONLINE_NEXT: Record<OnlineOrderStatus, readonly OnlineOrderStatus[]> = {
  NEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export interface Client {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

/** Мағоза дар рӯйхати бозор */
export interface StoreSummary {
  id: number;
  name: string;
  type: BusinessType;
  description: string;
  products: number;
  branches: number;
  cities: string[];
  /** То 4 эмоҷии маҳсулот — барои пешнамоиш */
  preview: string[];
  /** Баҳои миёна (1–5) ва шумораи баҳоҳо; null — ҳанӯз баҳо нест */
  rating: number | null;
  reviewCount: number;
}

/** Кушодани саҳифаи мағоза дар бозори онлайн */
export interface StoreVisits {
  series: { day: string; views: number }[];
  today: number;
  week: number;
  month: number;
}

export interface StoreReview {
  id: number;
  rating: number;
  text: string;
  /** Танҳо номи аввал — маълумоти шахсӣ нишон дода намешавад */
  author: string;
  createdAt: string;
}

export interface StoreDetail extends StoreSummary {
  branchList: Pick<Branch, 'id' | 'name' | 'city' | 'address' | 'phone'>[];
  /** Охирин шарҳҳо */
  reviews: StoreReview[];
  catalog: (Pick<Product, 'id' | 'name' | 'category' | 'emoji' | 'unit' | 'description' | 'price' | 'imageId'> & {
    soldOut: boolean;
    /** Боқимонда дар анбори ҳар филиал: { branchId: миқдор }; null — мол ҳисоб карда намешавад */
    stock: StoreStock[number];
  })[];
}

/** Боқимондаи зиндаи мағоза: { productId: { branchId: миқдор } | null } */
export type StoreStock = Record<number, Record<number, number> | null>;

export interface OnlineOrderItem {
  productId: number | null;
  name: string;
  emoji: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

export interface OnlineOrder {
  id: number;
  status: OnlineOrderStatus;
  /** Нақд ё корт; пардохт пас аз гирифтани мол */
  payment: Payment;
  store: { id: number; name: string; type: BusinessType };
  branch: { id: number; name: string } | null;
  client: { id: number; fullName: string; phone: string } | null;
  address: string;
  phone: string;
  note: string;
  total: number;
  items: OnlineOrderItem[];
  /** Тахфиф аз коди промо (аллакай аз total кам шуд) */
  discount: number;
  promoCode: string | null;
  /** Рақами миз, агар фармоиш аз QR-и тарабхона бошад */
  table: string | null;
  /** Баҳои мизоҷ (пас аз «Расонида шуд») */
  review: { rating: number; text: string } | null;
  createdAt: string;
  updatedAt: string;
}
