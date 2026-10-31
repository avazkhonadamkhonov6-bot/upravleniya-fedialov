"use client";

import {
  POSITION_LABELS,
  SHIFT_STATE_LABELS,
  type AttendanceSummary,
  type Branch,
  type Shift,
  type ShiftState,
  type User,
} from "@filialhub/shared";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ShiftButton, timeOf } from "@/components/shift-button";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, CardTitle, Empty, ErrorBox, Field, Input, Modal, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { useServerEvent } from "@/lib/events";
import { tr, locale } from "@/lib/i18n";
import { Glyph, Iconized, PositionIcon, stripEmoji } from "@/components/glyph";

const DAYS = ["Дш", "Сш", "Чш", "Пш", "Ҷм", "Шб", "Яш"];
const DAY_NAMES = ["Душанбе", "Сешанбе", "Чоршанбе", "Панҷшанбе", "Ҷумъа", "Шанбе", "Якшанбе"];

const STATE_STYLE: Record<ShiftState, string> = {
  PLANNED: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300",
  ON_SHIFT: "bg-good-soft text-good ring-good/25",
  DONE: "bg-surface-2 text-ink-2 ring-line",
  LATE: "bg-warn-soft text-warn ring-warn/25",
  ABSENT: "bg-brand-soft text-brand ring-brand/25",
};

/** Тартиб дар «Давомоти имрӯз»: аввал мушкилот */
const ATTEND_ORDER: Record<ShiftState, number> = { ABSENT: 0, LATE: 1, ON_SHIFT: 2, PLANNED: 3, DONE: 4 };

const TEMPLATES = [
  { label: "☀️ Субҳ", start: "09:00", end: "17:00" },
  { label: "🌙 Шом", start: "15:00", end: "23:00" },
  { label: "🧑‍💼 Рӯзи пурра", start: "10:00", end: "19:00" },
];

function mondayOf(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const dateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function SchedulePage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "STAFF" ? <MySchedule /> : <TeamSchedule />;
}

function WeekNav({ week, setWeek }: { week: Date; setWeek: (d: Date) => void }) {
  const end = addDays(week, 6);
  const isCurrent = sameDay(week, mondayOf(new Date()));
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <Button variant="ghost" size="sm" onClick={() => setWeek(addDays(week, -7))} aria-label={tr("Ҳафтаи гузашта")}>
        <ChevronLeft className="size-4" />
      </Button>
      <button onClick={() => setWeek(mondayOf(new Date()))} className="min-w-[150px] cursor-pointer px-2 text-center text-sm font-semibold text-ink">
        {week.toLocaleDateString(locale(), { day: "numeric", month: "short" })} – {end.toLocaleDateString(locale(), { day: "numeric", month: "short" })}
        {isCurrent && <span className="ml-1.5 text-xs font-medium text-brand">{tr("· ин ҳафта")}</span>}
      </button>
      <Button variant="ghost" size="sm" onClick={() => setWeek(addDays(week, 7))} aria-label={tr("Ҳафтаи оянда")}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function TeamSchedule() {
  const { user } = useAuth();
  const toast = useToast();
  const isChef = user?.role === "CHEF";
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [pickedBranch, setPickedBranch] = useState<number | undefined>();
  const [editing, setEditing] = useState<{ shift?: Shift; userId?: number; day?: Date } | null>(null);
  const [copying, setCopying] = useState(false);

  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const branchId = isChef ? (pickedBranch ?? branches?.[0]?.id) : (user?.branchId ?? undefined);
  const ready = !!branchId;
  const from = week.toISOString();
  const to = addDays(week, 7).toISOString();
  const { data: shifts, error, reload } = useApi<Shift[]>(ready ? `/shifts${qs({ branchId, from, to })}` : null);
  const { data: people } = useApi<User[]>(ready ? `/users${qs({ branchId: isChef ? branchId : undefined })}` : null);
  const { data: today, reload: reloadToday } = useApi<{ summary: AttendanceSummary; shifts: Shift[] }>(ready ? `/shifts/today${qs({ branchId })}` : null);
  // «Омадам / Рафтам»-и корманд ба менеҷер 🔔 мефиристад — ҳамон лаҳза давомот ва ҷадвал нав мешаванд
  useServerEvent("alerts", () => {
    reloadToday();
    reload();
  });

  const team = useMemo(
    () => (people ?? []).filter((p) => p.role !== "CHEF").sort((a, b) => (a.role === b.role ? (a.position ?? "").localeCompare(b.position ?? "") : a.role === "MANAGER" ? -1 : 1)),
    [people],
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const hours = (shifts ?? []).reduce((s, x) => s + (new Date(x.endsAt).getTime() - new Date(x.startsAt).getTime()) / 3600000, 0);

  async function copyWeek() {
    setCopying(true);
    try {
      const r = await api<{ created: number }>("/shifts/copy-week", { method: "POST", json: { branchId: isChef ? branchId : undefined, weekStart: week.toISOString() } });
      toast.success(r.created ? tr("{0} смена нусха шуд", r.created) : tr("Ҳамаи сменаҳо аллакай ҳастанд"), tr("Аз ҳафтаи гузашта"));
      reload();
    } catch (e) {
      toast.error(tr("Нусха нашуд"), (e as Error).message);
    } finally {
      setCopying(false);
    }
  }

  const summary = today?.summary;
  return (
    <>
      <PageHeader
        title={tr("Ҷадвал ва давомот")}
        subtitle={shifts ? tr("{0} смена · {1} соат дар ҳафта", shifts.length, Math.round(hours)) : tr("Боркунӣ…")}
        actions={
          <>
            {isChef && (
              <Select value={branchId ?? ""} onChange={(e) => setPickedBranch(Number(e.target.value))} className="w-52" aria-label={tr("Филиал")}>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <WeekNav week={week} setWeek={setWeek} />
            <Button variant="outline" onClick={copyWeek} loading={copying} title={tr("Ҷадвали ҳафтаи гузаштаро ба ин ҳафта нусха бардоштан")}>
              <Copy className="size-4" /> {tr("Нусхаи ҳафтаи гузашта")}
            </Button>
            {user?.role === "MANAGER" && <ShiftButton />}
          </>
        }
      />

      {/* Today attendance */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(
          [
            [tr("Имрӯз смена"), summary?.planned, "🗓", ""],
            [tr("Дар кор"), summary?.onShift, "✅", "text-good"],
            [tr("Дер омаданд"), summary?.late, "⏰", "text-warn"],
            [tr("Наомаданд"), summary?.absent, "🚫", "text-brand"],
            [tr("Тамом карданд"), summary?.done, "🏁", ""],
          ] as const
        ).map(([label, value, emoji, cls]) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between text-sm text-muted">
              {label} <Glyph e={emoji} className={cn("size-4", cls || "text-muted")} />
            </div>
            <div className={cn("mt-1 text-2xl font-bold text-ink tabular", cls)}>{value ?? "—"}</div>
          </div>
        ))}
      </div>

      <ErrorBox message={error} />
      <Card className="mt-6 overflow-hidden p-0">
        {!shifts || !people ? (
          <Skeleton className="m-4 h-96" />
        ) : team.length === 0 ? (
          <Empty icon="👥" title={tr("Дар филиал корманд нест")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-56 bg-surface px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted uppercase">{tr("Корманд")}</th>
                  {days.map((d, i) => {
                    const isToday = sameDay(d, new Date());
                    return (
                      <th key={i} className={cn("px-2 py-3 text-center", isToday && "bg-brand-soft/60")}>
                        <div className={cn("text-xs font-semibold uppercase", isToday ? "text-brand" : "text-muted")}>{tr(DAYS[i])}</div>
                        <div className={cn("text-lg font-bold", isToday ? "text-brand" : "text-ink")}>{d.getDate()}</div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-right text-xs font-semibold text-muted uppercase">{tr("Соат")}</th>
                </tr>
              </thead>
              <tbody>
                {team.map((p) => {
                  const mine = shifts.filter((s) => s.userId === p.id);
                  const total = mine.reduce((s, x) => s + (new Date(x.endsAt).getTime() - new Date(x.startsAt).getTime()) / 3600000, 0);
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.fullName} size={32} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">{p.fullName}</div>
                            <div className="text-xs text-muted">
                              <span className="inline-flex items-center gap-1"><PositionIcon position={p.position} className="size-3.5" />{p.position ? tr(POSITION_LABELS[p.position]) : stripEmoji(tr("🧑‍💼 Менеҷер"))}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {days.map((d, i) => {
                        const cell = mine.filter((s) => sameDay(new Date(s.startsAt), d));
                        const isToday = sameDay(d, new Date());
                        return (
                          <td key={i} className={cn("h-16 px-1.5 py-1.5 align-middle", isToday && "bg-brand-soft/30")}>
                            {cell.length ? (
                              cell.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => setEditing({ shift: s })}
                                  title={`${tr(SHIFT_STATE_LABELS[s.state])}${s.lateMinutes ? tr(" · {0} дақ дер", s.lateMinutes) : ""}`}
                                  className={cn("w-full cursor-pointer rounded-xl px-2 py-1.5 text-center ring-1 transition hover:brightness-95", STATE_STYLE[s.state])}
                                >
                                  <div className="text-xs font-bold tabular">
                                    {timeOf(s.startsAt)}–{timeOf(s.endsAt)}
                                  </div>
                                  <div className="text-[11px] font-medium opacity-80 tabular">
                                    {s.checkInAt ? (
                                      `${timeOf(s.checkInAt)}${s.checkOutAt ? `–${timeOf(s.checkOutAt)}` : ""}${s.lateMinutes ? ` ⏰+${s.lateMinutes}` : ""}`
                                    ) : s.lateMinutes ? (
                                      <Iconized text={tr("⏰ +{0} дақ", s.lateMinutes)} />
                                    ) : (
                                      tr(SHIFT_STATE_LABELS[s.state])
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <button
                                onClick={() => setEditing({ userId: p.id, day: d })}
                                className="group grid h-full min-h-12 w-full cursor-pointer place-items-center rounded-xl border-2 border-dashed border-transparent text-muted transition hover:border-line hover:bg-surface-2"
                                aria-label={tr("Смена барои {0}, {1}", p.fullName, tr(DAY_NAMES[i]))}
                              >
                                <Plus className="size-4 opacity-0 transition group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 text-right font-semibold text-ink-2 tabular">{Math.round(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 text-xs text-muted">
          {(Object.keys(STATE_STYLE) as ShiftState[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-3 rounded ring-1", STATE_STYLE[s])} /> {tr(SHIFT_STATE_LABELS[s])}
            </span>
          ))}
        </div>
      </Card>

      {today && today.shifts.length > 0 && (
        <Card className="mt-6">
          <CardTitle>{tr("Давомоти имрӯз: кӣ кай омад ва кай рафт")}</CardTitle>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {/* Аввал дер/наомада, баъд дар кор, баъд тамомкарда */}
            {[...today.shifts]
              .sort((a, b) => ATTEND_ORDER[a.state] - ATTEND_ORDER[b.state] || a.startsAt.localeCompare(b.startsAt))
              .map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                  <Avatar name={s.userName} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{s.userName}</div>
                    <div className="text-xs text-muted tabular">
                      {tr("смена")} {timeOf(s.startsAt)}–{timeOf(s.endsAt)}
                    </div>
                    <div className="text-xs font-semibold text-ink-2 tabular">
                      {s.checkInAt ? tr("омад {0}", timeOf(s.checkInAt)) : tr("ҳоло наомадааст")}
                      {s.checkOutAt && ` · ${tr("рафт {0}", timeOf(s.checkOutAt))}`}
                      {s.hoursWorked > 0 && ` · ${tr("{0} соат", s.hoursWorked)}`}
                    </div>
                  </div>
                  <Badge tone={s.state === "ABSENT" ? "brand" : s.lateMinutes ? "warn" : s.earlyMinutes ? "good" : s.state === "ON_SHIFT" ? "good" : "blue"}>
                    {s.lateMinutes
                      ? tr("+{0} дақ дер", s.lateMinutes)
                      : s.earlyMinutes
                        ? tr("{0} дақ барвақт", s.earlyMinutes)
                        : tr(SHIFT_STATE_LABELS[s.state])}
                  </Badge>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.shift ? tr("Смена") : tr("Сменаи нав")}>
        {editing && (
          <ShiftForm
            {...editing}
            people={team}
            onDone={() => {
              setEditing(null);
              reload();
              reloadToday();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function ShiftForm({ shift, userId, day, people, onDone }: { shift?: Shift; userId?: number; day?: Date; people: User[]; onDone: () => void }) {
  const toast = useToast();
  const base = shift ? new Date(shift.startsAt) : (day ?? new Date());
  const [f, setF] = useState({
    userId: shift?.userId ?? userId ?? people[0]?.id ?? 0,
    date: dateInput(base),
    start: shift ? timeOf(shift.startsAt) : "09:00",
    end: shift ? timeOf(shift.endsAt) : "17:00",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function range() {
    const startsAt = new Date(`${f.date}T${f.start}:00`);
    const endsAt = new Date(`${f.date}T${f.end}:00`);
    if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1); // смена то нисфи шаб
    return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (shift) await api(`/shifts/${shift.id}`, { method: "PATCH", json: range() });
      else await api("/shifts", { method: "POST", json: { userId: Number(f.userId), ...range() } });
      toast.success(shift ? tr("Смена захира шуд") : tr("Смена илова шуд"));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!shift || !confirm(tr("Смена нест карда шавад?"))) return;
    try {
      await api(`/shifts/${shift.id}`, { method: "DELETE" });
      toast.success(tr("Смена нест шуд"));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {shift ? (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <Avatar name={shift.userName} size={40} />
          <div className="flex-1">
            <div className="font-semibold text-ink">{shift.userName}</div>
            <div className="text-xs text-muted">
              {tr(SHIFT_STATE_LABELS[shift.state])}
              {shift.checkInAt && tr(" · омад {0}", timeOf(shift.checkInAt))}
              {shift.checkOutAt && tr(" · рафт {0}", timeOf(shift.checkOutAt))}
              {shift.hoursWorked > 0 && tr(" · {0} соат", shift.hoursWorked)}
            </div>
          </div>
          {shift.lateMinutes > 0 && <Badge tone="warn">+{shift.lateMinutes} {tr("дақ")}</Badge>}
        </div>
      ) : (
        <Field label={tr("Корманд")}>
          <Select value={f.userId} onChange={(e) => setF({ ...f, userId: Number(e.target.value) })}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} · {p.position ? tr(POSITION_LABELS[p.position]) : tr("Менеҷер")}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={tr("Сана")}>
        <Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            type="button"
            key={t.label}
            onClick={() => setF({ ...f, start: t.start, end: t.end })}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              f.start === t.start && f.end === t.end ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2 hover:bg-surface-2",
            )}
          >
            <Iconized text={tr(t.label)} /> {t.start}–{t.end}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={tr("Оғоз")}>
          <Input type="time" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        </Field>
        <Field label={tr("Анҷом")}>
          <Input type="time" required value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        </Field>
      </div>
      <ErrorBox message={error} />
      <div className="flex gap-2">
        {shift && (
          <Button type="button" variant="danger" onClick={remove} aria-label={tr("Нест кардан")}>
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" loading={busy} className="flex-1">
          {tr("Захира кардан")}
        </Button>
      </div>
    </form>
  );
}

function MySchedule() {
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const { data: shifts, error, reload } = useApi<Shift[]>(`/shifts${qs({ from: week.toISOString(), to: addDays(week, 7).toISOString() })}`);
  // Пас аз «Омадам / Рафтам» вақтҳо фавран дар ҷадвал пайдо шаванд
  useEffect(() => {
    window.addEventListener("fh-shift-change", reload);
    return () => window.removeEventListener("fh-shift-change", reload);
  }, [reload]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const hours = (shifts ?? []).reduce((s, x) => s + x.hoursWorked, 0);
  const late = (shifts ?? []).filter((s) => s.lateMinutes > 0).length;

  return (
    <>
      <PageHeader title={tr("Ҷадвали ман")} subtitle={shifts ? tr("{0} смена · {1} соат кор кардед · {2} бор дер", shifts.length, hours.toFixed(1), late) : tr("Боркунӣ…")} actions={<WeekNav week={week} setWeek={setWeek} />} />
      <div className="rise relative mb-6 overflow-hidden rounded-[24px] bg-[#16120f] p-6 text-white shadow-card">
        <div className="absolute -top-16 -right-16 size-52 rounded-full bg-[#dc3b1c]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-white/60">{tr("Давомот")}</div>
            <div className="text-2xl font-bold">{tr("Омадан ва рафтанро қайд кунед")}</div>
            <div className="mt-1 text-sm text-white/60">{tr("Ҳар омадан ва рафтан бо вақт ба менеҷер хабар дода мешавад. Метавонед паём ҳам нависед.")}</div>
          </div>
          <div className="rounded-2xl bg-white p-1.5">
            <ShiftButton />
          </div>
        </div>
      </div>
      <ErrorBox message={error} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d, i) => {
          const cell = (shifts ?? []).filter((s) => sameDay(new Date(s.startsAt), d));
          const isToday = sameDay(d, new Date());
          return (
            <div key={i} className={cn("card p-4", isToday && "border-brand ring-4 ring-brand/10")}>
              <div className={cn("text-xs font-semibold uppercase", isToday ? "text-brand" : "text-muted")}>{tr(DAY_NAMES[i])}</div>
              <div className="text-2xl font-bold text-ink">{d.getDate()}</div>
              <div className="mt-3 space-y-2">
                {!shifts ? (
                  <Skeleton className="h-12" />
                ) : cell.length === 0 ? (
                  <div className="rounded-xl bg-surface-2 py-3 text-center text-xs text-muted"><Iconized text={tr("🌴 Истироҳат")} /></div>
                ) : (
                  cell.map((s) => (
                    <div key={s.id} className={cn("rounded-xl px-2.5 py-2 ring-1", STATE_STYLE[s.state])}>
                      <div className="text-sm font-bold tabular">
                        {timeOf(s.startsAt)}–{timeOf(s.endsAt)}
                      </div>
                      <div className="text-[11px] font-medium">{s.lateMinutes ? <Iconized text={tr("⏰ +{0} дақ", s.lateMinutes)} /> : tr(SHIFT_STATE_LABELS[s.state])}</div>
                      {s.checkInAt && (
                        <div className="mt-1 text-[11px] font-semibold tabular">
                          {tr("омад {0}", timeOf(s.checkInAt))}
                          {s.checkOutAt && ` · ${tr("рафт {0}", timeOf(s.checkOutAt))}`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
