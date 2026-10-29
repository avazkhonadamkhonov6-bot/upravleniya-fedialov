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
  createdAt: string;
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
}

export const PAYMENTS = ['CASH', 'CARD'] as const;
export type Payment = (typeof PAYMENTS)[number];

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
  /** Панели супер-админ: тасдиқи бизнесҳо, ҳамаи филиалҳо ва кормандон */
  'admin',
] as const;
export type Feature = (typeof FEATURES)[number];

/**
 * Корманд танҳо ин саҳифаҳоро мебинад:
 * кассир — фурӯш (POS + сабад), таърихи фурӯш, профил; официант — меню, профил;
 * ошпаз ва фаррош — танҳо профил (бо маош ва рӯзи гирифтани он).
 */
export const STAFF_FEATURES: Record<Position, readonly Feature[]> = {
  CASHIER: ['pos', 'sales', 'online', 'profile', 'calls'],
  WAITER: ['products', 'profile', 'calls'],
  COOK: ['profile', 'calls'],
  CLEANER: ['profile', 'calls'],
  // Мағоза: фурӯшанда мол мефурӯшад ва рӯйхати молро мебинад; анбордор — рӯйхати мол
  SELLER: ['pos', 'sales', 'online', 'products', 'profile', 'calls'],
  STOREKEEPER: ['products', 'profile', 'calls'],
};

type Who = { role: Role; position: Position | null; isSuperAdmin?: boolean };

export function canAccess(u: Who, feature: Feature): boolean {
  if (feature === 'admin') return !!u.isSuperAdmin;
  if (u.role === 'CHEF') return true;
  if (u.role === 'MANAGER') return feature !== 'integrations' && feature !== 'audit';
  return !!u.position && STAFF_FEATURES[u.position].includes(feature);
}

/** Саҳифаи аввал пас аз воридшавӣ */
export function homePath(u: Who): string {
  if (u.isSuperAdmin) return '/admin';
  if (u.role !== 'STAFF') return '/dashboard';
  if (u.position === 'CASHIER' || u.position === 'SELLER') return '/pos';
  if (u.position === 'WAITER' || u.position === 'STOREKEEPER') return '/products';
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
    expenses: 'expenses',
    integrations: 'integrations',
    audit: 'audit',
    profile: 'profile',
    online: 'online',
    admin: 'admin',
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
  price: number;
  cost: number;
  profit: number;
  margin: number;
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
  items: OrderItem[];
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
  createdAt: string;
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
  hoursWorked: number;
  state: ShiftState;
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
}

export interface StoreDetail extends StoreSummary {
  branchList: Pick<Branch, 'id' | 'name' | 'city' | 'address' | 'phone'>[];
  catalog: Pick<Product, 'id' | 'name' | 'category' | 'emoji' | 'unit' | 'price'>[];
}

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
  createdAt: string;
  updatedAt: string;
}
