"use client";

import {
  POSITION_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Branch,
  type Priority,
  type Task,
  type TaskStatus,
  type User,
} from "@filialhub/shared";
import { AlarmClock, ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PriorityBadge } from "@/components/crm";
import { useToast } from "@/components/toast";
import { Avatar, Button, Empty, ErrorBox, Field, Input, Modal, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";
import { Glyph } from "@/components/glyph";

const COLUMN_STYLE: Record<TaskStatus, { emoji: string; ring: string; head: string }> = {
  TODO: { emoji: "📥", ring: "ring-[var(--chart-profit)]/30", head: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  IN_PROGRESS: { emoji: "⚡", ring: "ring-warn/30", head: "bg-warn-soft text-warn" },
  DONE: { emoji: "✅", ring: "ring-good/30", head: "bg-good-soft text-good" },
};

function dueLabel(t: Task) {
  if (!t.dueDate) return null;
  const d = new Date(t.dueDate);
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const text = days === 0 ? tr("имрӯз") : days === 1 ? tr("фардо") : days === -1 ? tr("дирӯз") : d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
  return { text, overdue: t.overdue, soon: days <= 1 && t.status !== "DONE" };
}

export default function TasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isStaff = user?.role === "STAFF";
  const isChef = user?.role === "CHEF";
  const [branchId, setBranchId] = useState<number | undefined>();
  const [mine, setMine] = useState(false);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [optimistic, setOptimistic] = useState<Record<number, TaskStatus>>({});

  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data, error, reload } = useApi<Task[]>(`/tasks${qs({ branchId, mine: mine || undefined })}`);
  const tasks = (data ?? []).map((t) => (optimistic[t.id] ? { ...t, status: optimistic[t.id] } : t));

  async function move(t: Task, status: TaskStatus) {
    if (t.status === status) return;
    setOptimistic((o) => ({ ...o, [t.id]: status }));
    try {
      await api(`/tasks/${t.id}`, { method: "PATCH", json: { status } });
      if (status === "DONE") toast.success(tr("Офарин! Вазифа иҷро шуд 🎉"), t.title);
      reload();
    } catch (e) {
      toast.error(tr("Ҳолат иваз нашуд"), (e as Error).message);
    } finally {
      setOptimistic((o) => {
        const next = { ...o };
        delete next[t.id];
        return next;
      });
    }
  }

  const counts = {
    open: tasks.filter((t) => t.status !== "DONE").length,
    overdue: tasks.filter((t) => t.overdue).length,
    high: tasks.filter((t) => t.priority === "HIGH" && t.status !== "DONE").length,
  };

  return (
    <>
      <PageHeader
        title={tr("Вазифаҳо")}
        subtitle={
          data
            ? tr("{0} вазифаи кушода · {1} фаврӣ{2}", counts.open, counts.high, counts.overdue ? tr(" · {0} мӯҳлаташ гузашт", counts.overdue) : "")
            : tr("Боркунӣ…")
        }
        actions={
          !isStaff && (
            <>
              {isChef && (
                <Select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || undefined)} className="w-52" aria-label={tr("Филиал")}>
                  <option value="">{tr("Ҳамаи филиалҳо")}</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              )}
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-2">
                <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[var(--brand)]" />
                {tr("Танҳо аз они ман")}
              </label>
              <Button onClick={() => setEditing("new")}>
                <Plus className="size-4" /> {tr("Вазифаи нав")}
              </Button>
            </>
          )
        }
      />
      <ErrorBox message={error} />

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const col = tasks.filter((t) => t.status === status);
            const style = COLUMN_STYLE[status];
            return (
              <section
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(status);
                }}
                onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                onDrop={() => {
                  const t = tasks.find((x) => x.id === dragId);
                  setOverCol(null);
                  setDragId(null);
                  if (t) move(t, status);
                }}
                className={cn(
                  "flex min-h-[420px] flex-col rounded-[24px] border border-line bg-surface-2/60 p-3 transition",
                  overCol === status && `ring-4 ${style.ring} bg-surface`,
                )}
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <span className={cn("rounded-full px-3 py-1 text-sm font-bold", style.head)}>
                    <Glyph e={style.emoji} className="size-4" /> {tr(TASK_STATUS_LABELS[status])}
                  </span>
                  <span className="text-sm font-bold text-muted tabular">{col.length}</span>
                </header>
                <div className="flex-1 space-y-2.5">
                  {col.length === 0 && (
                    <div className="grid h-32 place-items-center rounded-2xl border-2 border-dashed border-line text-sm text-muted">
                      {isStaff ? tr("Холӣ") : tr("Вазифаро ба ин ҷо кашед")}
                    </div>
                  )}
                  {col.map((t) => {
                    const due = dueLabel(t);
                    const idx = TASK_STATUSES.indexOf(t.status);
                    return (
                      <article
                        key={t.id}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => setDragId(null)}
                        className={cn(
                          "card card-hover group cursor-grab p-3.5 active:cursor-grabbing",
                          dragId === t.id && "opacity-40",
                          t.overdue && "border-brand/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <PriorityBadge priority={t.priority} />
                          {!isStaff && (
                            <button
                              onClick={() => setEditing(t)}
                              className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted opacity-0 transition group-hover:opacity-100 hover:bg-surface-2 hover:text-ink focus:opacity-100"
                              aria-label={tr("Таҳрир")}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <h3 className={cn("mt-2 font-semibold text-ink", t.status === "DONE" && "text-muted line-through")}>{t.title}</h3>
                        {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{t.description}</p>}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {t.assignee ? (
                              <>
                                <Avatar name={t.assignee.fullName} size={24} />
                                <span className="truncate text-xs font-medium text-ink-2">{t.assignee.fullName.split(" ")[0]}</span>
                              </>
                            ) : (
                              <span className="text-xs text-muted">{tr("Бе иҷрокунанда")}</span>
                            )}
                          </div>
                          {due && (
                            <span
                              className={cn(
                                "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                due.overdue ? "bg-brand-soft text-brand" : due.soon ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted",
                              )}
                            >
                              <AlarmClock className="size-3" /> {due.text}
                            </span>
                          )}
                        </div>
                        {isChef && !branchId && t.branchName && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted"><Glyph e="🏪" className="size-3" /> {t.branchName.replace("FilialHub ", "")}</div>
                        )}
                        {/* Тугмаҳо барои телефон (drag дар экрани ламсӣ кор намекунад) */}
                        <div className="mt-3 flex gap-1.5 border-t border-line pt-2.5">
                          {idx > 0 && (
                            <button
                              onClick={() => move(t, TASK_STATUSES[idx - 1])}
                              className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
                            >
                              <ArrowLeft className="size-3" /> {tr(TASK_STATUS_LABELS[TASK_STATUSES[idx - 1]])}
                            </button>
                          )}
                          {idx < TASK_STATUSES.length - 1 && (
                            <button
                              onClick={() => move(t, TASK_STATUSES[idx + 1])}
                              className="ml-auto flex cursor-pointer items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand hover:brightness-95"
                            >
                              {tr(TASK_STATUS_LABELS[TASK_STATUSES[idx + 1]])} <ArrowRight className="size-3" />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {data && data.length === 0 && isStaff && <Empty icon="🎉" title={tr("Ҳоло вазифа нест")} text={tr("Вақте менеҷер вазифа медиҳад, дар ин ҷо пайдо мешавад.")} />}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Вазифаи нав") : tr("Таҳрири вазифа")}>
        {editing && (
          <TaskForm
            task={editing === "new" ? undefined : editing}
            branches={branches}
            defaultBranchId={branchId ?? user?.branchId ?? branches?.[0]?.id}
            onDone={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function TaskForm({
  task,
  branches,
  defaultBranchId,
  onDone,
}: {
  task?: Task;
  branches?: Branch[];
  defaultBranchId?: number;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const isChef = user?.role === "CHEF";
  const [f, setF] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: (task?.priority ?? "MEDIUM") as Priority,
    dueDate: task?.dueDate?.slice(0, 10) ?? "",
    branchId: task?.branchId ?? defaultBranchId ?? 0,
    assigneeId: task?.assignee?.id ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: people } = useApi<User[]>(f.branchId ? `/users${qs({ branchId: isChef ? f.branchId : undefined })}` : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: f.title,
      description: f.description,
      priority: f.priority,
      dueDate: f.dueDate ? new Date(`${f.dueDate}T18:00:00`).toISOString() : null,
      branchId: isChef ? Number(f.branchId) : undefined,
      assigneeId: Number(f.assigneeId) || null,
    };
    try {
      if (task) await api(`/tasks/${task.id}`, { method: "PATCH", json: body });
      else await api("/tasks", { method: "POST", json: body });
      toast.success(task ? tr("Вазифа захира шуд") : tr("Вазифа сохта шуд"), body.assigneeId ? tr("Иҷрокунанда огоҳ карда шуд 🔔") : undefined);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task || !confirm(tr("«{0}» нест карда шавад?", task.title))) return;
    try {
      await api(`/tasks/${task.id}`, { method: "DELETE" });
      toast.success(tr("Вазифа нест шуд"));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label={tr("Сарлавҳа")}>
        <Input required minLength={3} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={tr("Масалан: Тоза кардани фритюр")} />
      </Field>
      <Field label={tr("Тавсиф")}>
        <textarea
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          rows={3}
          maxLength={1000}
          className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
        />
      </Field>
      <Field label={tr("Афзалият")}>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setF({ ...f, priority: p })}
              className={cn(
                "cursor-pointer rounded-xl border p-2.5 text-sm font-semibold transition",
                f.priority === p ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-ink-2",
              )}
            >
              <Glyph e={p === "HIGH" ? "🔥" : p === "MEDIUM" ? "⚡" : "🌿"} className="mr-1 inline size-4 -mt-0.5" />
              {tr(PRIORITY_LABELS[p])}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {isChef && (
          <Field label={tr("Филиал")}>
            <Select value={f.branchId} onChange={(e) => setF({ ...f, branchId: Number(e.target.value), assigneeId: 0 })}>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={tr("Мӯҳлат")}>
          <Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
        </Field>
      </div>
      <Field label={tr("Иҷрокунанда")}>
        <Select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: Number(e.target.value) })}>
          <option value={0}>{tr("— Бе иҷрокунанда —")}</option>
          {people
            ?.filter((p) => p.role !== "CHEF")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} · {p.position ? tr(POSITION_LABELS[p.position]) : tr("Менеҷер")}
              </option>
            ))}
        </Select>
      </Field>
      <ErrorBox message={error} />
      <div className="flex gap-2 pt-1">
        {task && (
          <Button type="button" variant="danger" onClick={remove} aria-label={tr("Нест кардан")}>
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" loading={busy} className="flex-1">
          {task ? tr("Захира кардан") : tr("Сохтан")}
        </Button>
      </div>
    </form>
  );
}
