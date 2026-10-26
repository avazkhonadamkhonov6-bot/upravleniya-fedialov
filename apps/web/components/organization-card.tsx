"use client";

import { BUSINESS_TYPE_EMOJI, BUSINESS_TYPE_LABELS, BUSINESS_TYPES, type BusinessType, type Organization, type User } from "@filialhub/shared";
import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import { Button, Card, CardTitle, ErrorBox, Field, Input, Modal, Select, cn } from "./ui";

/**
 * «Бизнеси ман»: ном, навъи кор, тавсиф ва намоиш дар бозори онлайн (танҳо шеф иваз мекунад).
 * Шеф метавонад якчанд бизнес дошта бошад ва байни онҳо гузарад.
 */
export function OrganizationCard() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const org = user?.organization;
  const isChef = user?.role === "CHEF";
  const [name, setName] = useState(org?.name ?? "");
  const [type, setType] = useState<BusinessType>(org?.type ?? "OTHER");
  const [description, setDescription] = useState(org?.description ?? "");
  const [isPublic, setIsPublic] = useState(org?.isPublic ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: businesses } = useApi<(Organization & { current: boolean })[]>(isChef ? "/auth/businesses" : null);
  if (!user || !org) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api<Organization>("/auth/organization", { method: "PATCH", json: { name, type, description, isPublic } });
      setUser({ ...user, organization: updated });
      toast.success(tr("Захира шуд"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** Гузариш ба бизнеси дигар: корбар бо бизнеси нав, баъд панели асосӣ (маълумот аз нав гирифта мешавад) */
  async function switchTo(id: number) {
    try {
      setUser(await api<User>(`/auth/businesses/${id}/switch`, { method: "POST" }));
      router.push("/dashboard");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <Card>
        <CardTitle>
          {BUSINESS_TYPE_EMOJI[org.type]} {tr("Бизнеси ман")}
        </CardTitle>
        {!isChef ? (
          <div className="text-sm">
            <div className="font-semibold text-ink">{org.name}</div>
            <div className="text-muted">{tr(BUSINESS_TYPE_LABELS[org.type])}</div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <Field label={tr("Номи бизнес")}>
              <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={tr("Навъи кор")} hint={tr("Аз он вазифаҳои кормандон, «Меню» / «Маҳсулот» ва услуби мағоза вобаста аст")}>
              <Select value={type} onChange={(e) => setType(e.target.value as BusinessType)}>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_EMOJI[t]} {tr(BUSINESS_TYPE_LABELS[t])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr("Тавсиф барои мизоҷон")}>
              <Input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder={tr("Масалан: маҳсулоти тоза ҳар рӯз")} />
            </Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="size-4 accent-[var(--brand)]" />
              {tr("Дар бозори онлайн нишон дода шавад")}
            </label>
            <ErrorBox message={error} />
            <Button type="submit" loading={busy} className="w-full">
              {tr("Захира кардан")}
            </Button>
          </form>
        )}

        {isChef && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{tr("Ҳамаи бизнесҳои ман")}</div>
            <ul className="space-y-1.5">
              {businesses?.map((b) => (
                <li key={b.id}>
                  <button
                    disabled={b.current}
                    onClick={() => switchTo(b.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition disabled:cursor-default",
                      b.current ? "border-brand/40 bg-brand-soft" : "border-line hover:bg-surface-2",
                    )}
                  >
                    <span className="text-xl">{BUSINESS_TYPE_EMOJI[b.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{b.name}</span>
                      <span className="block text-xs text-muted">{tr(BUSINESS_TYPE_LABELS[b.type])}</span>
                    </span>
                    {b.current ? <Check className="size-4 text-brand" /> : <span className="text-xs font-semibold text-brand">{tr("Гузаштан")}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-3 w-full" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> {tr("Бизнеси нав")}
            </Button>
          </div>
        )}
      </Card>
      <Modal open={creating} onClose={() => setCreating(false)} title={tr("Бизнеси нав")}>
        {creating && <NewBusinessForm />}
      </Modal>
    </>
  );
}

function NewBusinessForm() {
  const { setUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return setError(tr("Навъи корро интихоб кунед"));
    setBusy(true);
    setError(null);
    try {
      setUser(await api<User>("/auth/businesses", { method: "POST", json: { name, type } }));
      // Бизнеси нав холӣ аст — ба саҳифаи филиалҳо бо дастури 3 қадам
      router.push("/branches?welcome=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="space-y-4">
      <p className="text-sm text-muted">{tr("Бизнеси нав алоҳида аст: филиалҳо, кормандон ва маҳсулоти худро дорад. Байни бизнесҳо дар Профил мегузаред.")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BUSINESS_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={cn("flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-2.5 text-left text-xs font-semibold transition", type === t ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2")}
          >
            <span className="text-xl">{BUSINESS_TYPE_EMOJI[t]}</span>
            {tr(BUSINESS_TYPE_LABELS[t])}
          </button>
        ))}
      </div>
      <Field label={tr("Номи бизнес")}>
        <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <ErrorBox message={error} />
      <Button type="submit" loading={busy} className="w-full">
        {tr("Сохтан ва гузаштан")}
      </Button>
    </form>
  );
}
