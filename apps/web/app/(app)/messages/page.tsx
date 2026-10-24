"use client";

import {
  POSITION_EMOJI,
  POSITION_LABELS,
  ROLE_LABELS,
  telegramLink,
  whatsappLink,
  type Channel,
  type DeliveryStatus,
  type MessageLog,
  type MessageRecipient,
  type MessageRecipients,
  type MessageResult,
} from "@filialhub/shared";
import { Check, Search, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardTitle,
  cn,
  Empty,
  ErrorBox,
  formatDate,
  Input,
  PageHeader,
  Select,
  Skeleton,
  TelegramIcon,
  WhatsAppIcon,
} from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

const STATUS: Record<DeliveryStatus, { label: string; tone: "good" | "blue" | "brand" | "warn" }> = {
  SENT: { label: "Фиристода шуд", tone: "good" },
  DRY_RUN: { label: "Санҷишӣ (бе токен)", tone: "blue" },
  FAILED: { label: "Хатогӣ", tone: "brand" },
  NOT_LINKED: { label: "Telegram пайваст нест", tone: "warn" },
};

export default function MessagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const toast = useToast();
  const preselect = Number(useSearchParams().get("to")) || 0;
  const { data, error } = useApi<MessageRecipients>("/messages/recipients");
  const history = useApi<MessageLog[]>("/messages");

  const [selected, setSelected] = useState<number[]>(preselect ? [preselect] : []);
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("");
  const [text, setText] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["WHATSAPP", "TELEGRAM"]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<MessageResult[] | null>(null);

  const recipients = useMemo(() => data?.recipients ?? [], [data]);
  const branches = useMemo(
    () => [...new Map(recipients.filter((r) => r.branchId).map((r) => [r.branchId!, r.branchName ?? ""])).entries()],
    [recipients],
  );
  const shown = recipients.filter((r) => {
    const q = query.trim().toLowerCase();
    if (branch && String(r.branchId) !== branch) return false;
    return !q || r.fullName.toLowerCase().includes(q) || r.phone.includes(q) || r.telegram.toLowerCase().includes(q);
  });
  const chosen = recipients.filter((r) => selected.includes(r.id));
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.includes(r.id));

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () =>
    setSelected((s) => (allShownSelected ? s.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...s, ...shown.map((r) => r.id)])]));
  const toggleChannel = (c: Channel) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  async function send() {
    if (!chosen.length) return toast.error(tr("Қабулкунандаро интихоб кунед"));
    if (!text.trim()) return toast.error(tr("Матни паёмро нависед"));
    if (!channels.length) return toast.error(tr("WhatsApp ё Telegram-ро интихоб кунед"));
    setBusy(true);
    try {
      const res = await api<MessageResult[]>("/messages", { method: "POST", json: { userIds: selected, text, channels } });
      setResults(res);
      history.reload();
      const sent = res.filter((r) => r.status === "SENT").length;
      toast.success(tr("Паём фиристода шуд"), sent ? tr("{0} паём рафт", sent) : tr("Дар сайт сабт шуд 🔔"));
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} />;

  return (
    <>
      <PageHeader title={tr("Паёмҳо")} subtitle={tr("Ба WhatsApp ва Telegram-и кормандон нависед")} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Қабулкунандагон */}
        <Card className="flex flex-col p-0">
          <div className="space-y-3 border-b border-line p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">{tr("Ба кӣ")}</h2>
              <span className="text-sm text-muted">{tr("{0} интихоб шуд", selected.length)}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Ҷустуҷӯ…")} className="pl-10" />
              </div>
              {branches.length > 1 && (
                <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="sm:w-52" aria-label={tr("Филиал")}>
                  <option value="">{tr("Ҳамаи филиалҳо")}</option>
                  {branches.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            {shown.length > 0 && (
              <button onClick={toggleAll} className="cursor-pointer text-sm font-semibold text-brand hover:underline">
                {allShownSelected ? tr("Ҳамаро бекор кардан") : tr("Ҳамаро интихоб кардан ({0})", shown.length)}
              </button>
            )}
          </div>
          <div className="max-h-[520px] flex-1 overflow-y-auto p-2">
            {!data ? (
              <Skeleton className="m-3 h-64" />
            ) : shown.length === 0 ? (
              <Empty title={tr("Ҳеҷ чиз ёфт нашуд")} />
            ) : (
              shown.map((r) => <RecipientRow key={r.id} r={r} checked={selected.includes(r.id)} onToggle={() => toggle(r.id)} />)
            )}
          </div>
        </Card>

        {/* Паём */}
        <div className="space-y-6">
          <Card>
            <CardTitle>{tr("Паём")}</CardTitle>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder={tr("Матни паёмро нависед…")}
              className="w-full resize-y rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand/50 focus:bg-surface"
            />
            <div className="mt-1 text-right text-xs text-muted tabular">{text.length} / 2000</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ChannelToggle on={channels.includes("WHATSAPP")} onClick={() => toggleChannel("WHATSAPP")} color="#1fa855" icon={<WhatsAppIcon />} label="WhatsApp" />
              <ChannelToggle on={channels.includes("TELEGRAM")} onClick={() => toggleChannel("TELEGRAM")} color="#229ed9" icon={<TelegramIcon className="size-4" />} label="Telegram" />
            </div>

            {data && (!data.configured.whatsapp || !data.configured.telegram) && (
              <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted">
                {tr(
                  "💡 Агар токени бот/WhatsApp дар сервер набошад, паём дар сайт (🔔) ва таърих сабт мешавад. Барои фиристодан аз телефони худ — тугмаҳои зеринро пахш кунед.",
                )}
              </p>
            )}

            <Button onClick={send} loading={busy} className="mt-4 w-full">
              <Send className="size-4" /> {tr("Фиристодан ({0})", chosen.length)}
            </Button>
          </Card>

          {chosen.length > 0 && text.trim() && (
            <Card>
              <CardTitle>{tr("Аз телефони худ фиристодан")}</CardTitle>
              <p className="-mt-2 mb-3 text-sm text-muted">{tr("WhatsApp ё Telegram бо ҳамин матн кушода мешавад.")}</p>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {chosen.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
                    <Avatar name={r.fullName} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{r.fullName}</span>
                    <a
                      href={whatsappLink(r.whatsapp || r.phone, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#1fa855]/10 px-2.5 py-1.5 text-xs font-semibold text-[#1fa855] hover:bg-[#1fa855]/20"
                    >
                      <WhatsAppIcon className="size-3.5" /> WhatsApp
                    </a>
                    <a
                      href={telegramLink(r.telegram || r.phone, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#229ed9]/10 px-2.5 py-1.5 text-xs font-semibold text-[#229ed9] hover:bg-[#229ed9]/20"
                    >
                      <TelegramIcon className="size-3.5" /> Telegram
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {results && (
            <Card>
              <CardTitle>{tr("Натиҷа")}</CardTitle>
              <ul className="space-y-2">
                {results.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {r.channel === "WHATSAPP" ? <WhatsAppIcon className="size-4 text-[#1fa855]" /> : <TelegramIcon className="size-4 text-[#229ed9]" />}
                    <span className="min-w-0 flex-1 truncate text-ink">{r.fullName}</span>
                    <Badge tone={STATUS[r.status].tone}>{tr(STATUS[r.status].label)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-6 p-0">
        <div className="border-b border-line p-5">
          <h2 className="text-base font-semibold text-ink">{tr("Таърихи паёмҳо")}</h2>
        </div>
        {!history.data ? (
          <Skeleton className="m-5 h-40" />
        ) : history.data.length === 0 ? (
          <Empty icon="✉️" title={tr("Ҳоло паём нест")} />
        ) : (
          <ul className="cv-auto divide-y divide-line">
            {history.data.map((m) => (
              <li key={m.id} className="flex gap-3 p-4">
                <span className="mt-0.5">
                  {m.channel === "WHATSAPP" ? <WhatsAppIcon className="size-4 text-[#1fa855]" /> : <TelegramIcon className="size-4 text-[#229ed9]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <b className="text-ink">{m.senderName ?? "—"}</b>
                    <span className="text-muted">→</span>
                    <b className="text-ink">{m.recipientName ?? m.to}</b>
                    <Badge tone={STATUS[m.status].tone}>{tr(STATUS[m.status].label)}</Badge>
                    <span className="ml-auto text-xs text-muted tabular">{formatDate(m.createdAt, true)}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-ink-2">{m.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function RecipientRow({ r, checked, onToggle }: { r: MessageRecipient; checked: boolean; onToggle: () => void }) {
  const role = r.position ? `${POSITION_EMOJI[r.position]} ${tr(POSITION_LABELS[r.position])}` : tr(ROLE_LABELS[r.role]);
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition",
        checked ? "bg-brand-soft" : "hover:bg-surface-2",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border transition",
          checked ? "border-brand bg-brand text-white" : "border-line bg-surface",
        )}
      >
        {checked && <Check className="size-3.5" />}
      </span>
      <Avatar name={r.fullName} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{r.fullName}</span>
        <span className="block truncate text-xs text-muted">
          {role}
          {r.branchName ? ` · ${r.branchName}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-muted">
        <WhatsAppIcon className="size-3.5" />
        <TelegramIcon className={cn("size-3.5", r.telegramLinked && "text-[#229ed9]")} />
      </span>
    </button>
  );
}

function ChannelToggle({ on, onClick, color, icon, label }: { on: boolean; onClick: () => void; color: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
        on ? "border-transparent" : "border-line bg-surface-2 text-muted",
      )}
      style={on ? { background: `color-mix(in oklab, ${color} 14%, transparent)`, color } : undefined}
    >
      {icon} {label}
      {on && <Check className="size-4" />}
    </button>
  );
}
