import { locale, tr } from "./i18n";

/** Санаи маҳаллӣ «2026-11-15» (+ n рӯз) */
export function dayKey(addDays = 0, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + addDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ҳолати мӯҳлати қарз: гузашт (чанд рӯз), имрӯз, ё санаи оянда */
export function dueInfo(due: string): { tone: "overdue" | "today" | "future"; label: string; days: number } {
  const [y, m, d] = due.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const date = target.toLocaleDateString(locale(), { day: "numeric", month: "short" });
  if (days < 0) return { tone: "overdue", days: -days, label: tr("мӯҳлат гузашт · {0} рӯз", -days) };
  if (days === 0) return { tone: "today", days: 0, label: tr("мӯҳлат имрӯз") };
  return { tone: "future", days, label: tr("мӯҳлат то {0}", date) };
}
