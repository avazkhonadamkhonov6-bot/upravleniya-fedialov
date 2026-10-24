"use client";

import {
  POSITION_EMOJI,
  POSITION_LABELS,
  ROLE_LABELS,
  type Channel,
  type ChatContact,
  type ChatMessage,
  type DeliveryStatus,
  type MessageResult,
} from "@filialhub/shared";
import { ArrowLeft, Check, CheckCheck, Megaphone, Search, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, cn, Empty, ErrorBox, Input, Modal, PageHeader, Skeleton, TelegramIcon, WhatsAppIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { locale, tr } from "@/lib/i18n";

interface ContactsResponse {
  contacts: ChatContact[];
  configured: { telegram: boolean; whatsapp: boolean };
}

const STATUS: Record<DeliveryStatus, { label: string; tone: "good" | "blue" | "brand" | "warn" }> = {
  SENT: { label: "Фиристода шуд", tone: "good" },
  DRY_RUN: { label: "Санҷишӣ (бе токен)", tone: "blue" },
  FAILED: { label: "Хатогӣ", tone: "brand" },
  NOT_LINKED: { label: "Telegram пайваст нест", tone: "warn" },
};

const roleOf = (c: Pick<ChatContact, "position" | "role">) =>
  c.position ? `${POSITION_EMOJI[c.position]} ${tr(POSITION_LABELS[c.position])}` : tr(ROLE_LABELS[c.role]);

function timeShort(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Chat />
    </Suspense>
  );
}

function Chat() {
  const router = useRouter();
  const activeId = Number(useSearchParams().get("to")) || 0;
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [broadcast, setBroadcast] = useState(false);

  const loadContacts = useCallback(() => {
    api<ContactsResponse>("/messages/contacts")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  // Рӯйхат ҳар 8 сония нав мешавад (паёмҳои нав ва нохондашудаҳо).
  useEffect(() => {
    loadContacts();
    const t = setInterval(loadContacts, 8000);
    return () => clearInterval(t);
  }, [loadContacts]);

  const open = (id: number) => router.replace(id ? `/messages?to=${id}` : "/messages", { scroll: false });
  const contacts = useMemo(() => data?.contacts ?? [], [data]);
  const active = contacts.find((c) => c.id === activeId) ?? null;
  const q = query.trim().toLowerCase();
  const shown = q ? contacts.filter((c) => c.fullName.toLowerCase().includes(q) || (c.branchName ?? "").toLowerCase().includes(q)) : contacts;

  return (
    <>
      <PageHeader
        title={tr("Паёмҳо")}
        subtitle={tr("Дар ин ҷо нависед ва ҷавобҳоро бинед — нусха ба WhatsApp ва Telegram меравад")}
        actions={
          <Button variant="outline" onClick={() => setBroadcast(true)}>
            <Megaphone className="size-4" /> {tr("Ба чанд нафар")}
          </Button>
        }
      />
      <ErrorBox message={error} />
      {data && (!data.configured.whatsapp || !data.configured.telegram) && (
        <p className="mb-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          {tr("💡 Нусха ба WhatsApp/Telegram танҳо пас аз гузоштани токенҳо дар сервер меравад. Ҳоло паёмҳо дар сайт сабт мешаванд.")}{" "}
          {!data.configured.telegram && <b className="text-ink-2">Telegram: {tr("токен нест")}.</b>}{" "}
          {!data.configured.whatsapp && <b className="text-ink-2">WhatsApp: {tr("токен нест")}.</b>}
        </p>
      )}

      <Card className="grid h-[calc(100dvh-15rem)] min-h-[520px] overflow-hidden p-0 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Рӯйхати суҳбатҳо */}
        <div className={cn("flex min-h-0 flex-col border-line lg:border-r", active && "hidden lg:flex")}>
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Ҷустуҷӯ…")} className="pl-10" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!data ? (
              <Skeleton className="m-2 h-64" />
            ) : shown.length === 0 ? (
              <Empty title={tr("Ҳеҷ чиз ёфт нашуд")} />
            ) : (
              shown.map((c) => <ContactRow key={c.id} c={c} active={c.id === activeId} onClick={() => open(c.id)} />)
            )}
          </div>
        </div>

        {/* Суҳбат */}
        <div className={cn("min-h-0", !active && "hidden lg:block")}>
          {active ? (
            <Thread key={active.id} contact={active} onBack={() => open(0)} onSent={loadContacts} />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <div className="mb-3 text-5xl">💬</div>
                <div className="font-semibold text-ink">{tr("Суҳбатро интихоб кунед")}</div>
                <p className="mt-1 text-sm text-muted">{tr("Аз рӯйхати чап касеро интихоб кунед, то ба ӯ нависед.")}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Modal open={broadcast} onClose={() => setBroadcast(false)} title={tr("Паём ба чанд нафар")}>
        {broadcast && (
          <Broadcast
            contacts={contacts}
            onDone={() => {
              setBroadcast(false);
              loadContacts();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function ContactRow({ c, active, onClick }: { c: ChatContact; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition", active ? "bg-brand-soft" : "hover:bg-surface-2")}
    >
      <div className="relative">
        <Avatar name={c.fullName} size={42} />
        {c.telegramLinked && (
          <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-[#229ed9] text-white ring-2 ring-surface">
            <TelegramIcon className="size-2.5" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm text-ink", c.unread ? "font-bold" : "font-semibold")}>{c.fullName}</span>
          {c.lastMessage && <span className="shrink-0 text-[11px] text-muted tabular">{timeShort(c.lastMessage.createdAt)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", c.unread ? "font-semibold text-ink-2" : "text-muted")}>
            {c.lastMessage ? `${c.lastMessage.mine ? tr("Шумо:") + " " : ""}${c.lastMessage.text}` : `${roleOf(c)}${c.branchName ? " · " + c.branchName : ""}`}
          </span>
          {c.unread > 0 && (
            <span className="brand-gradient grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white">{c.unread}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function Thread({ contact, onBack, onSent }: { contact: ChatContact; onBack: () => void; onSent: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["WHATSAPP", "TELEGRAM"]);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  // Аввал ҳамаи суҳбат, баъд ҳар 4 сония танҳо паёмҳои нав.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const rows = await api<ChatMessage[]>(`/messages/thread/${contact.id}${lastId.current ? `?after=${lastId.current}` : ""}`);
        if (!alive) return;
        if (rows.length) lastId.current = rows[rows.length - 1].id;
        setMessages((m) => (m && lastId.current ? [...m, ...rows.filter((r) => !m.some((x) => x.id === r.id))] : rows));
      } catch {}
    };
    void pull();
    const t = setInterval(pull, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [contact.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const res = await api<{ messages: ChatMessage[]; results: MessageResult[] }>("/messages", {
        method: "POST",
        json: { userIds: [contact.id], text: body, channels },
      });
      setText("");
      const m = res.messages[0];
      lastId.current = Math.max(lastId.current, m.id);
      setMessages((list) => [...(list ?? []), m]);
      onSent();
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggle = (c: Channel) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line p-3">
        <button onClick={onBack} className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 lg:hidden" aria-label={tr("Пештар")}>
          <ArrowLeft className="size-5" />
        </button>
        <Avatar name={contact.fullName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-ink">{contact.fullName}</div>
          <div className="truncate text-xs text-muted">
            {roleOf(contact)}
            {contact.branchName ? ` · ${contact.branchName}` : ""}
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs sm:flex">
          <span className="flex items-center gap-1 rounded-full bg-[#1fa855]/10 px-2 py-1 font-semibold text-[#1fa855]">
            <WhatsAppIcon className="size-3.5" /> {contact.whatsapp || contact.phone}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
              contact.telegramLinked ? "bg-[#229ed9]/10 text-[#229ed9]" : "bg-surface-2 text-muted",
            )}
          >
            <TelegramIcon className="size-3.5" /> {contact.telegramLinked ? tr("Пайваст") : tr("Пайваст нест")}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,var(--line)_1px,transparent_0)] [background-size:18px_18px] p-4">
        {!messages ? (
          <Skeleton className="h-40" />
        ) : messages.length === 0 ? (
          <Empty icon="👋" title={tr("Ҳоло паём нест")} text={tr("Аввалин паёмро нависед.")} />
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} mine={m.senderId === user?.id} />)
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">{tr("Нусха ба:")}</span>
          <MiniToggle on={channels.includes("WHATSAPP")} onClick={() => toggle("WHATSAPP")} color="#1fa855" icon={<WhatsAppIcon className="size-3.5" />} label="WhatsApp" />
          <MiniToggle
            on={channels.includes("TELEGRAM")}
            onClick={() => toggle("TELEGRAM")}
            color="#229ed9"
            icon={<TelegramIcon className="size-3.5" />}
            label={contact.telegramLinked ? "Telegram" : tr("Telegram (пайваст нест)")}
          />
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={tr("Паём нависед… (Enter — фиристодан)")}
            className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand/50 focus:bg-surface field-sizing-content"
          />
          <Button onClick={send} loading={busy} disabled={!text.trim()} className="h-11 w-11 shrink-0 px-0" aria-label={tr("Фиристодан")}>
            {!busy && <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const time = new Date(m.createdAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[70%]")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line shadow-sm",
            mine ? "brand-gradient rounded-br-md text-white" : "rounded-bl-md border border-line bg-surface text-ink",
          )}
        >
          {m.text}
        </div>
        <div className={cn("mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted", mine && "justify-end")}>
          {!mine && m.source !== "WEB" && (
            <span className="flex items-center gap-1">
              {m.source === "WHATSAPP" ? <WhatsAppIcon className="size-3 text-[#1fa855]" /> : <TelegramIcon className="size-3 text-[#229ed9]" />}
              {tr("аз {0}", m.source === "WHATSAPP" ? "WhatsApp" : "Telegram")}
            </span>
          )}
          <span className="tabular">{time}</span>
          {mine && (
            <>
              {m.whatsappStatus && <DeliveryMark channel="WHATSAPP" status={m.whatsappStatus} />}
              {m.telegramStatus && <DeliveryMark channel="TELEGRAM" status={m.telegramStatus} />}
              {m.readAt ? <CheckCheck className="size-3.5 text-[#229ed9]" aria-label={tr("Хонда шуд")} /> : <Check className="size-3.5" aria-label={tr("Фиристода шуд")} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryMark({ channel, status }: { channel: Channel; status: DeliveryStatus }) {
  const s = STATUS[status];
  return (
    <span title={`${channel === "WHATSAPP" ? "WhatsApp" : "Telegram"}: ${tr(s.label)}`} className="flex items-center gap-0.5">
      {channel === "WHATSAPP" ? <WhatsAppIcon className="size-3" /> : <TelegramIcon className="size-3" />}
      <Badge tone={s.tone} className="px-1.5 py-0 text-[10px]">
        {tr(s.label)}
      </Badge>
    </span>
  );
}

function MiniToggle({ on, onClick, color, icon, label }: { on: boolean; onClick: () => void; color: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition", on ? "border-transparent" : "border-line text-muted")}
      style={on ? { background: `color-mix(in oklab, ${color} 14%, transparent)`, color } : undefined}
    >
      {icon} {label} {on && <Check className="size-3" />}
    </button>
  );
}

/** Хабар ба чанд нафар якбора */
function Broadcast({ contacts, onDone }: { contacts: ChatContact[]; onDone: () => void }) {
  const toast = useToast();
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["WHATSAPP", "TELEGRAM"]);
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = q ? contacts.filter((c) => c.fullName.toLowerCase().includes(q) || (c.branchName ?? "").toLowerCase().includes(q)) : contacts;
  const allShown = shown.length > 0 && shown.every((c) => selected.includes(c.id));
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function send() {
    if (!selected.length) return toast.error(tr("Қабулкунандаро интихоб кунед"));
    if (!text.trim()) return toast.error(tr("Матни паёмро нависед"));
    setBusy(true);
    try {
      const res = await api<{ messages: ChatMessage[]; results: MessageResult[] }>("/messages", { method: "POST", json: { userIds: selected, text, channels } });
      const sent = res.results.filter((r) => r.status === "SENT").length;
      toast.success(tr("Паём фиристода шуд"), tr("{0} нафар · {1} нусха ба WhatsApp/Telegram рафт", res.messages.length, sent));
      onDone();
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Ҷустуҷӯ…")} className="pl-10" />
      </div>
      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => setSelected((s) => (allShown ? s.filter((id) => !shown.some((c) => c.id === id)) : [...new Set([...s, ...shown.map((c) => c.id)])]))}
          className="cursor-pointer font-semibold text-brand hover:underline"
        >
          {allShown ? tr("Ҳамаро бекор кардан") : tr("Ҳамаро интихоб кардан ({0})", shown.length)}
        </button>
        <span className="text-muted">{tr("{0} интихоб шуд", selected.length)}</span>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-line p-1">
        {shown.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-2">
            <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-[var(--brand)]" />
            <Avatar name={c.fullName} size={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{c.fullName}</span>
              <span className="block truncate text-xs text-muted">
                {roleOf(c)}
                {c.branchName ? ` · ${c.branchName}` : ""}
              </span>
            </span>
          </label>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={tr("Матни паёмро нависед…")}
        className="w-full resize-y rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand/50 focus:bg-surface"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">{tr("Нусха ба:")}</span>
        <MiniToggle
          on={channels.includes("WHATSAPP")}
          onClick={() => setChannels((cs) => (cs.includes("WHATSAPP") ? cs.filter((x) => x !== "WHATSAPP") : [...cs, "WHATSAPP"]))}
          color="#1fa855"
          icon={<WhatsAppIcon className="size-3.5" />}
          label="WhatsApp"
        />
        <MiniToggle
          on={channels.includes("TELEGRAM")}
          onClick={() => setChannels((cs) => (cs.includes("TELEGRAM") ? cs.filter((x) => x !== "TELEGRAM") : [...cs, "TELEGRAM"]))}
          color="#229ed9"
          icon={<TelegramIcon className="size-3.5" />}
          label="Telegram"
        />
      </div>
      <Button onClick={send} loading={busy} className="w-full">
        <Send className="size-4" /> {tr("Фиристодан ({0})", selected.length)}
      </Button>
    </div>
  );
}
