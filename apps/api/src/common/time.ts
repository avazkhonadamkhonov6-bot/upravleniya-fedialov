// Тоҷикистон соати тобистона надорад, бинобар ин офсети собит +5 соат кифоя аст.
export const TZ = process.env.TIMEZONE ?? 'Asia/Dushanbe';
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** Оғози рӯзи ҷорӣ (00:00 вақти маҳаллӣ) дар UTC */
export function startOfLocalDay(date = new Date(), addDays = 0): Date {
  const local = new Date(date.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() + addDays);
  return new Date(local.getTime() - OFFSET_MS);
}

/** Санаи маҳаллӣ «2026-10-29» */
export function localDay(date = new Date()): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Оғози ҳафтаи ҷорӣ (душанбе) */
export function startOfLocalWeek(date = new Date()): Date {
  const local = new Date(date.getTime() + OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // 0 = душанбе
  return startOfLocalDay(date, -dow);
}

/** Оғози моҳи ҷорӣ */
export function startOfLocalMonth(date = new Date()): Date {
  const local = new Date(date.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(1);
  return new Date(local.getTime() - OFFSET_MS);
}

export function periodStart(period: 'day' | 'week' | 'month'): Date {
  if (period === 'week') return startOfLocalWeek();
  if (period === 'month') return startOfLocalMonth();
  return startOfLocalDay();
}

/** Санаи маҳаллӣ ба шакли YYYY-MM-DD */
export function localDateKey(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}
