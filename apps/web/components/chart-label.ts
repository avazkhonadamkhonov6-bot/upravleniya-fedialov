import { tr } from "@/lib/i18n";

// Алоҳида аз charts.tsx, то саҳифаҳо бе боркунии recharts имзои санаро гиранд.
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function bucketLabel(date: string, granularity: "day" | "week" | "month") {
  const [y, m, d] = date.split("-").map(Number);
  if (granularity === "month") return `${tr(MONTHS[m - 1])} ${String(y).slice(2)}`;
  return `${d} ${tr(MONTHS[m - 1])}`;
}
