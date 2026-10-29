"use client";

import {
  DEFAULT_PRODUCT_EMOJI,
  defaultUnit,
  POSITION_LABELS,
  SUGGESTED_CATEGORIES,
  UNITS,
  TELEGRAM_PATTERN,
  type Branch,
  type Position,
  type Product,
  type User,
} from "@filialhub/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth, useBusiness } from "@/lib/auth";
import { PRODUCT_ICONS, ProductIcon } from "./glyph";
import { useToast } from "./toast";
import { Button, ErrorBox, Field, Input, Select } from "./ui";
import { tr } from "@/lib/i18n";
import { Iconized } from "./glyph";

function useSubmit(onDone: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, success = tr("Захира шуд")) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast.success(success);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

export function BranchForm({ branch, onDone }: { branch?: Branch; onDone: () => void }) {
  const { user: me } = useAuth();
  const [f, setF] = useState({
    name: branch?.name ?? `${me?.organization?.name ?? ""} `.trimStart(),
    city: branch?.city ?? "",
    address: branch?.address ?? "",
    phone: branch?.phone ?? "+992 ",
    email: branch?.email ?? "",
    openedAt: (branch?.openedAt ?? new Date().toISOString()).slice(0, 10),
    isActive: branch?.isActive ?? true,
  });
  const { busy, error, run } = useSubmit(onDone);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...f, openedAt: new Date(f.openedAt).toISOString() };
    run(() =>
      branch
        ? api(`/branches/${branch.id}`, { method: "PATCH", json: body })
        : api("/branches", { method: "POST", json: { ...body, isActive: undefined } }),
    );
  };

  const remove = () => {
    if (!branch || !confirm(tr("Филиали «{0}» нест карда шавад?", branch.name))) return;
    run(async () => {
      try {
        return await api(`/branches/${branch.id}`, { method: "DELETE" });
      } catch (e) {
        // Филиал фурӯш дорад — тасдиқи дуюм: ҳамаи таърихи филиал ҳам нест мешавад
        if (e instanceof ApiError && e.status === 400 && confirm(`${e.message}

${tr("Филиал бо ҳамаи фурӯш, хароҷот ва ҷадвалаш пурра нест карда шавад? Инро баргардондан намешавад.")}`)) {
          return api(`/branches/${branch.id}?force=true`, { method: "DELETE" });
        }
        throw e;
      }
    }, tr("Филиал нест шуд"));
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label={tr("Номи филиал")}>
        <Input required value={f.name} onChange={set("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Шаҳр")}>
          <Input required value={f.city} onChange={set("city")} placeholder={tr("Душанбе")} />
        </Field>
        <Field label={tr("Санаи кушодашавӣ")}>
          <Input type="date" required value={f.openedAt} onChange={set("openedAt")} />
        </Field>
      </div>
      <Field label={tr("Суроға")}>
        <Input required value={f.address} onChange={set("address")} placeholder={tr("кӯчаи …")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Телефон")}>
          <Input required value={f.phone} onChange={set("phone")} />
        </Field>
        <Field label={tr("Почтаи электронӣ")}>
          <Input type="email" required value={f.email} onChange={set("email")} />
        </Field>
      </div>
      {branch && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          {tr("Филиал фаъол аст")}
        </label>
      )}
      <ErrorBox message={error} />
      <div className="flex gap-2 pt-2">
        {branch && (
          <Button type="button" variant="danger" onClick={remove} disabled={busy}>
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

export function UserForm({
  user,
  branches,
  defaultBranchId,
  onDone,
}: {
  user?: User;
  branches: Branch[];
  defaultBranchId?: number;
  onDone: () => void;
}) {
  const { user: me } = useAuth();
  const { positions } = useBusiness();
  const isChef = me?.role === "CHEF";
  const [f, setF] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "+992 ",
    whatsapp: user?.whatsapp ?? "",
    telegram: user?.telegram ?? "",
    password: "",
    role: (user?.role === "MANAGER" ? "MANAGER" : "STAFF") as "MANAGER" | "STAFF",
    position: (user?.position ?? positions[0]) as Position,
    branchId: user?.branchId ?? defaultBranchId ?? me?.branchId ?? branches[0]?.id ?? 0,
    salary: user?.salary ?? 3000,
    payDay: user?.payDay ?? 1,
    hiredAt: (user?.hiredAt ?? new Date().toISOString()).slice(0, 10),
    isActive: user?.isActive ?? true,
  });
  const { busy, error, run } = useSubmit(onDone);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      fullName: f.fullName,
      email: f.email,
      phone: f.phone,
      whatsapp: f.whatsapp,
      telegram: f.telegram,
      salary: Number(f.salary),
      payDay: Number(f.payDay),
      hiredAt: new Date(f.hiredAt).toISOString(),
      position: f.role === "STAFF" ? f.position : undefined,
    };
    if (isChef) {
      body.role = f.role;
      body.branchId = Number(f.branchId);
    }
    if (f.password) body.password = f.password;
    if (user) body.isActive = f.isActive;
    run(() => (user ? api(`/users/${user.id}`, { method: "PATCH", json: body }) : api("/users", { method: "POST", json: body })));
  };

  const remove = () => {
    if (!user || !confirm(tr("{0} аз система нест карда шавад?", user.fullName))) return;
    run(() => api(`/users/${user.id}`, { method: "DELETE" }), tr("Корманд нест шуд"));
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label={tr("Ному насаб")}>
        <Input required value={f.fullName} onChange={set("fullName")} placeholder={tr("Фирдавс Раҳимов")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Рақами телефон")}>
          <Input required type="tel" value={f.phone} onChange={set("phone")} placeholder="+992 90 123 4567" />
        </Field>
        <Field label={tr("Почтаи электронӣ")} hint={tr("Барои воридшавӣ")}>
          <Input type="email" required value={f.email} onChange={set("email")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp" hint={tr("Агар холӣ бошад — рақами телефон")}>
          <Input type="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="+992 90 123 4567" />
        </Field>
        <Field label="Telegram" hint={tr("@номи_корбар ё рақам")}>
          <Input
                    name="telegram-handle"
                    value={f.telegram}
                    onChange={set("telegram")}
                    placeholder="@username"
                    // Браузер почтаро ба ин майдон худкор нагузорад
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    pattern={TELEGRAM_PATTERN}
                    title={tr("@номи_корбар ё рақами телефон")}
                  />
        </Field>
      </div>
      {isChef && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("Нақш")}>
            <Select value={f.role} onChange={set("role")}>
              <option value="STAFF">{tr("Корманд")}</option>
              <option value="MANAGER">{tr("Менеҷери филиал")}</option>
            </Select>
          </Field>
          <Field label={tr("Филиал")}>
            <Select value={f.branchId} onChange={set("branchId")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {f.role === "STAFF" && (
        <Field label={tr("Вазифа|position")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {positions.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setF({ ...f, position: p })}
                className={`cursor-pointer rounded-xl border p-3 text-sm font-semibold transition ${
                  f.position === p ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-ink-2 hover:border-ink-2/30"
                }`}
              >
                {tr(POSITION_LABELS[p])}
              </button>
            ))}
          </div>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tr("Маош (сомонӣ)")}>
          <Input type="number" min={0} step={100} value={f.salary} onChange={set("salary")} />
        </Field>
        <Field label={tr("Рӯзи маош")} hint={tr("Рӯзи моҳ (1–28)")}>
          <Input type="number" min={1} max={28} required value={f.payDay} onChange={set("payDay")} />
        </Field>
        <Field label={tr("Санаи қабул")}>
          <Input type="date" value={f.hiredAt} onChange={set("hiredAt")} />
        </Field>
      </div>
      <Field label={user ? tr("Пароли нав (ихтиёрӣ)") : tr("Парол")} hint={tr("Камаш 6 аломат")}>
        <Input type="password" required={!user} minLength={6} value={f.password} onChange={set("password")} autoComplete="new-password" />
      </Field>
      {user && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          {tr("Фаъол (метавонад ворид шавад)")}
        </label>
      )}
      {!user && (
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          <Iconized text={tr("📩 Пас аз сабт ба корманд паёми хуш омадед тавассути WhatsApp/Telegram фиристода мешавад, ва менеҷери филиал огоҳ карда мешавад.")} />
        </p>
      )}
      <ErrorBox message={error} />
      <div className="flex gap-2 pt-2">
        {user && (
          <Button type="button" variant="danger" onClick={remove} disabled={busy} aria-label={tr("Нест кардан")}>
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" loading={busy} className="flex-1">
          {user ? tr("Захира кардан") : tr("Илова кардан")}
        </Button>
      </div>
    </form>
  );
}

export function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const { type, catalog } = useBusiness();
  const categories = SUGGESTED_CATEGORIES[type ?? "OTHER"];
  const [f, setF] = useState({
    name: product?.name ?? "",
    category: product?.category ?? categories[0],
    emoji: product?.emoji ?? DEFAULT_PRODUCT_EMOJI[type ?? "OTHER"],
    unit: product?.unit ?? defaultUnit(type),
    price: product?.price ?? 0,
    cost: product?.cost ?? 0,
    isActive: product?.isActive ?? true,
  });
  const { busy, error, run } = useSubmit(onDone);
  const [picking, setPicking] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const price = Number(f.price) || 0;
  const cost = Number(f.cost) || 0;
  const profit = price - cost;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, category: f.category, emoji: f.emoji, unit: f.unit, price, cost, ...(product ? { isActive: f.isActive } : {}) };
    run(() => (product ? api(`/products/${product.id}`, { method: "PATCH", json: body }) : api("/products", { method: "POST", json: body })));
  };
  const remove = () => {
    if (!product || !confirm(tr("«{0}» нест карда шавад?", product.name))) return;
    run(() => api(`/products/${product.id}`, { method: "DELETE" }), tr("Маҳсулот хориҷ шуд"));
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-[64px_1fr] items-end gap-4">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          className="grid size-16 cursor-pointer place-items-center rounded-2xl bg-brand-soft text-brand ring-brand/30 transition hover:ring-4"
          aria-label={tr("Иконкаро интихоб кунед")}
          aria-expanded={picking}
        >
          <ProductIcon value={f.emoji} type={type} className="size-8" />
        </button>
        <Field label={tr("Ном")}>
          <Input required value={f.name} onChange={set("name")} />
        </Field>
      </div>
      {picking && (
        <div className="pop grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl border border-line bg-surface-2 p-2 sm:grid-cols-8" role="listbox" aria-label={tr("Иконкаҳо")}>
          {Object.entries(PRODUCT_ICONS).map(([name, Icon]) => {
            const on = f.emoji === `icon:${name}`;
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={name}
                onClick={() => {
                  setF({ ...f, emoji: `icon:${name}` });
                  setPicking(false);
                }}
                className={`grid aspect-square cursor-pointer place-items-center rounded-xl transition hover:scale-110 ${on ? "bg-brand text-white" : "bg-surface text-ink-2 hover:text-brand"}`}
              >
                <Icon className="size-5" />
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-[1fr_140px] gap-4">
        <Field label={tr("Категория")}>
          <Input required value={f.category} onChange={set("category")} list="categories" />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label={tr("Воҳид")}>
          <Input required value={f.unit} onChange={set("unit")} list="units" maxLength={20} />
          <datalist id="units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={tr("Нархи фурӯш (барои 1 {0})", f.unit)}>
          <Input type="number" min={0} step="0.5" required value={f.price} onChange={set("price")} />
        </Field>
        <Field label={tr("Арзиши аслӣ")}>
          <Input type="number" min={0} step="0.5" required value={f.cost} onChange={set("cost")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2 p-4">
        <div>
          <div className="text-xs text-muted">{tr("Фоида аз 1 {0}", f.unit)}</div>
          <div className="text-lg font-bold tabular" style={{ color: profit >= 0 ? "var(--chart-profit)" : "var(--brand)" }}>
            {profit.toFixed(2)} {tr("сомонӣ")}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">{tr("Маржа")}</div>
          <div className="text-lg font-bold text-ink tabular">{price ? ((profit / price) * 100).toFixed(1) : 0}%</div>
        </div>
      </div>
      {product && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          {tr("Дар «{0}» нишон дода шавад", tr(catalog))}
        </label>
      )}
      <ErrorBox message={error} />
      <div className="flex gap-2 pt-2">
        {product && (
          <Button type="button" variant="danger" onClick={remove} disabled={busy} aria-label={tr("Нест кардан")}>
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
