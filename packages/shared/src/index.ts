// Умумӣ барои web ва api: нақшҳо, вазифаҳо, номҳои тоҷикӣ ва типҳои ҷавобҳои API.

export const ROLES = ['CHEF', 'MANAGER', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

export const POSITIONS = ['COOK', 'WAITER', 'CASHIER', 'CLEANER'] as const;
export type Position = (typeof POSITIONS)[number];

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
};

export const POSITION_EMOJI: Record<Position, string> = {
  COOK: '👨‍🍳',
  WAITER: '🧑‍💼',
  CASHIER: '💵',
  CLEANER: '🧹',
};

/** Вазифаҳое, ки фурӯш (POS) сабт карда метавонанд. */
export const SELLER_POSITIONS: readonly Position[] = ['CASHIER'];

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
  'profile',
] as const;
export type Feature = (typeof FEATURES)[number];

/**
 * Корманд танҳо ин саҳифаҳоро мебинад:
 * кассир — фурӯш (POS + сабад), таърихи фурӯш, профил; официант — меню, профил;
 * ошпаз ва фаррош — танҳо профил (бо маош ва рӯзи гирифтани он).
 */
export const STAFF_FEATURES: Record<Position, readonly Feature[]> = {
  CASHIER: ['pos', 'sales', 'profile'],
  WAITER: ['products', 'profile'],
  COOK: ['profile'],
  CLEANER: ['profile'],
};

type Who = { role: Role; position: Position | null };

export function canAccess(u: Who, feature: Feature): boolean {
  if (u.role === 'CHEF') return true;
  if (u.role === 'MANAGER') return feature !== 'integrations' && feature !== 'audit';
  return !!u.position && STAFF_FEATURES[u.position].includes(feature);
}

/** Саҳифаи аввал пас аз воридшавӣ */
export function homePath(u: Who): string {
  if (u.role !== 'STAFF') return '/dashboard';
  if (u.position === 'CASHIER') return '/pos';
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
    expenses: 'expenses',
    integrations: 'integrations',
    audit: 'audit',
    profile: 'profile',
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
}

export interface Product {
  id: number;
  name: string;
  category: string;
  emoji: string;
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

export interface IntegrationStatus {
  telegram: { configured: boolean; botUsername: string | null; linkedUsers: number };
  whatsapp: { configured: boolean };
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

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  text: string;
  source: MessageSource;
  whatsappStatus: DeliveryStatus | null;
  telegramStatus: DeliveryStatus | null;
  readAt: string | null;
  createdAt: string;
}

export interface ChatContact extends MessageRecipient {
  lastMessage: { text: string; createdAt: string; mine: boolean } | null;
  unread: number;
}
