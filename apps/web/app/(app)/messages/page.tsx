"use client";

import {
  telegramLink,
  whatsappLink,
  POSITION_LABELS,
  ROLE_LABELS,
  type Channel,
  type ChatContact,
  type ChatMessage,
  type ContactInfo,
  type DeliveryStatus,
  type MessageResult,
} from "@filialhub/shared";
import { ArrowLeft, Briefcase, Building2, CalendarDays, Check, CheckCheck, Mail, Megaphone, Wallet, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Search, Send, Video } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCalls } from "@/components/calls";
import { RecordButtons, VideoNoteBubble, VideoNoteRecorder, VoiceBubble, VoiceRecorder } from "@/components/chat-media";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, cn, Empty, ErrorBox, Input, Modal, money, PageHeader, Skeleton, TelegramIcon, WhatsAppIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { useVisibleInterval } from "@/lib/use-interval";
import { subscribe, useServerEvent } from "@/lib/events";
import { locale, tr } from "@/lib/i18n";
import { mediaSupported, type Recording } from "@/lib/media";
import { Glyph, Iconized, stripEmoji } from "@/components/glyph";

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

/** Ранг ва номи ҳар канал: чатҳои WhatsApp ва Telegram алоҳида ва бо ранги худ */
const CH = {
  WHATSAPP: { label: "WhatsApp", color: "#1fa855", soft: "rgb(31 168 85 / 0.12)", grad: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)", Icon: WhatsAppIcon, param: "wa" },
  TELEGRAM: { label: "Telegram", color: "#229ed9", soft: "rgb(34 158 217 / 0.12)", grad: "linear-gradient(135deg, #2aabee 0%, #1c86c8 100%)", Icon: TelegramIcon, param: "tg" },
} as const;

const roleOf = (c: Pick<ChatContact, "position" | "role">) =>
  c.position ? tr(POSITION_LABELS[c.position]) : tr(ROLE_LABELS[c.role]);

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
  const params = useSearchParams();
  const activeId = Number(params.get("to")) || 0;
  const channel: Channel = params.get("ch") === "tg" ? "TELEGRAM" : "WHATSAPP";
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [broadcast, setBroadcast] = useState(false);

  const loadContacts = useCallback(() => {
    api<ContactsResponse>(`/messages/contacts?channel=${channel}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [channel]);

  // Рӯйхат бо хабари фаврӣ аз сервер нав мешавад; polling-и суст — агар пайваст канда шавад.
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);
  useServerEvent("messages", loadContacts);
  useVisibleInterval(loadContacts, 30000);

  const go = (id: number, ch: Channel) => router.replace(`/messages?ch=${CH[ch].param}${id ? `&to=${id}` : ""}`, { scroll: false });
  const open = (id: number) => go(id, channel);
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
          <Iconized text={tr("💡 Нусха ба WhatsApp/Telegram танҳо пас аз гузоштани токенҳо дар сервер меравад. Ҳоло паёмҳо дар сайт сабт мешаванд.")} />{" "}
          {!data.configured.telegram && <b className="text-ink-2">Telegram: {tr("токен нест")}.</b>}{" "}
          {!data.configured.whatsapp && <b className="text-ink-2">WhatsApp: {tr("токен нест")}.</b>}
        </p>
      )}

      <Card className="grid h-[calc(100dvh-15rem)] min-h-[520px] overflow-hidden p-0 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Рӯйхати суҳбатҳо */}
        <div className={cn("flex min-h-0 flex-col border-line lg:border-r", active && "hidden lg:flex")}>
          <div className="space-y-3 border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Ҷустуҷӯ…")} className="pl-10" />
            </div>
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label={tr("Канал")}>
              {(["WHATSAPP", "TELEGRAM"] as const).map((ch) => {
                const c = CH[ch];
                const on = channel === ch;
                return (
                  <button
                    key={ch}
                    role="tab"
                    aria-selected={on}
                    onClick={() => go(activeId, ch)}
                    className={cn("flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition", on ? "text-white shadow-lg" : "border border-line bg-surface-2 hover:border-transparent")}
                    style={on ? { background: c.grad, boxShadow: `0 10px 22px -12px ${c.color}` } : { color: c.color }}
                  >
                    <c.Icon className="size-4" /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!data ? (
              <Skeleton className="m-2 h-64" />
            ) : shown.length === 0 ? (
              <Empty title={tr("Ҳеҷ чиз ёфт нашуд")} />
            ) : (
              shown.map((c) => <ContactRow key={c.id} c={c} channel={channel} active={c.id === activeId} onClick={() => open(c.id)} />)
            )}
          </div>
        </div>

        {/* Суҳбат */}
        <div className={cn("min-h-0", !active && "hidden lg:block")}>
          {active ? (
            <Thread key={`${active.id}-${channel}`} contact={active} channel={channel} onBack={() => open(0)} onSent={loadContacts} />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <div className="mb-3 grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><Glyph e="💬" className="size-8" /></div>
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

function ContactRow({ c, channel, active, onClick }: { c: ChatContact; channel: Channel; active: boolean; onClick: () => void }) {
  const ch = CH[channel];
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition", !active && "hover:bg-surface-2")}
      style={active ? { background: ch.soft } : undefined}
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
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: ch.grad }}>
              {c.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Thread({ contact, channel, onBack, onSent }: { contact: ChatContact; channel: Channel; onBack: () => void; onSent: () => void }) {
  const ch = CH[channel];
  const channels = useMemo<Channel[]>(() => [channel], [channel]);
  const [infoOpen, setInfoOpen] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const calls = useCalls();
  const [recording, setRecording] = useState<"voice" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  // Аввал ҳамаи суҳбат, баъд ҳар 4 сония танҳо паёмҳои нав.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const rows = await api<ChatMessage[]>(`/messages/thread/${contact.id}?channel=${channel}${lastId.current ? `&after=${lastId.current}` : ""}`);
        if (!alive) return;
        if (rows.length) lastId.current = rows[rows.length - 1].id;
        setMessages((m) => (m && lastId.current ? [...m, ...rows.filter((r) => !m.some((x) => x.id === r.id))] : rows));
      } catch {}
    };
    void pull();
    const off = subscribe("messages", () => void pull());
    const t = setInterval(() => document.visibilityState === "visible" && void pull(), 20000);
    return () => {
      alive = false;
      off();
      clearInterval(t);
    };
  }, [contact.id, channel]);

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

  async function sendMedia(rec: Recording, kind: "VOICE" | "VIDEO_NOTE") {
    setRecording(null);
    setUploading(true);
    try {
      const q = new URLSearchParams({ to: String(contact.id), kind, duration: String(rec.seconds), channels: channels.join(",") });
      const res = await api<{ message: ChatMessage; results: MessageResult[] }>(`/messages/media?${q}`, {
        method: "POST",
        body: rec.blob,
        headers: { "Content-Type": rec.mime || (kind === "VOICE" ? "audio/webm" : "video/webm") },
      });
      lastId.current = Math.max(lastId.current, res.message.id);
      setMessages((list) => [...(list ?? []), res.message]);
      onSent();
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const canRecord = mediaSupported();

  // Агар Telegram пайваст набошад — паём дар сайт мемонад; WhatsApp ба рақам меравад.
  const target = channel === "WHATSAPP" ? contact.whatsapp || contact.phone : contact.telegramLinked ? tr("Telegram-и {0}", contact.fullName.split(" ")[0]) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line p-3" style={{ background: `linear-gradient(90deg, ${ch.soft}, transparent 70%)` }}>
        <button onClick={onBack} className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 lg:hidden" aria-label={tr("Пештар")}>
          <ArrowLeft className="size-5" />
        </button>
        <button onClick={() => setInfoOpen(true)} className="relative cursor-pointer rounded-full transition hover:scale-105 active:scale-95" aria-label={tr("Маълумот дар бораи {0}", contact.fullName)} title={tr("Маълумоти пурра")}>
          <Avatar name={contact.fullName} size={40} />
          <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full text-white ring-2 ring-surface" style={{ background: ch.grad }}>
            <ch.Icon className="size-3" />
          </span>
        </button>
        <button onClick={() => setInfoOpen(true)} className="min-w-0 flex-1 cursor-pointer text-left">
          <div className="truncate font-semibold text-ink">{contact.fullName}</div>
          <div className="truncate text-xs text-muted">
            {roleOf(contact)}
            {contact.branchName ? ` · ${contact.branchName}` : ""}
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => calls.startCall(contact, false)}
            disabled={calls.busy}
            className="grid size-10 cursor-pointer place-items-center rounded-xl text-ink-2 transition hover:bg-brand-soft hover:text-brand active:scale-90 disabled:opacity-40"
            aria-label={tr("Занги аудио")}
            title={tr("Занги аудио")}
          >
            <Phone className="size-5" />
          </button>
          <button
            onClick={() => calls.startCall(contact, true)}
            disabled={calls.busy}
            className="grid size-10 cursor-pointer place-items-center rounded-xl text-ink-2 transition hover:bg-brand-soft hover:text-brand active:scale-90 disabled:opacity-40"
            aria-label={tr("Занги видео")}
            title={tr("Занги видео")}
          >
            <Video className="size-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,var(--line)_1px,transparent_0)] [background-size:18px_18px] p-4">
        {!messages ? (
          <Skeleton className="h-40" />
        ) : messages.length === 0 ? (
          <Empty icon="👋" title={tr("Ҳоло паём нест")} text={tr("Аввалин паёмро нависед.")} />
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} mine={m.senderId === user?.id} grad={ch.grad} />)
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: target ? ch.color : undefined }}>
          <ch.Icon className="size-3.5 shrink-0" />
          {target ? (
            <span className="truncate font-semibold">{tr("Паём ба {0} меравад: {1}", ch.label, target)}</span>
          ) : (
            <span className="truncate font-semibold text-warn">{tr("{0} Telegram-ро пайваст накардааст — паём танҳо дар сайт мемонад", contact.fullName)}</span>
          )}
        </div>
        <div className="flex items-end gap-2">
          {recording === "voice" ? (
            <VoiceRecorder onSend={(r) => void sendMedia(r, "VOICE")} onCancel={() => setRecording(null)} />
          ) : (
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
          )}
          {recording !== "voice" &&
            (text.trim() || !canRecord ? (
              <Button onClick={send} loading={busy} disabled={!text.trim()} className="h-11 w-11 shrink-0 px-0" aria-label={tr("Фиристодан")}>
                {!busy && <Send className="size-4" />}
              </Button>
            ) : uploading ? (
              <Button loading className="h-11 w-11 shrink-0 px-0" aria-label={tr("Фиристода истодааст…")} />
            ) : (
              <RecordButtons onVoice={() => setRecording("voice")} onVideo={() => setRecording("video")} />
            ))}
        </div>
        {recording === "video" && <VideoNoteRecorder onSend={(r) => void sendMedia(r, "VIDEO_NOTE")} onClose={() => setRecording(null)} />}
        <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title={tr("Маълумот дар бораи корманд")}>
          {infoOpen && <ContactInfoView id={contact.id} />}
        </Modal>
      </div>
    </div>
  );
}

function Bubble({ m, mine, grad }: { m: ChatMessage; mine: boolean; grad: string }) {
  const time = new Date(m.createdAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (m.kind === "CALL") {
    const missed = !m.durationSec;
    const Icon = missed ? PhoneMissed : mine ? PhoneOutgoing : PhoneIncoming;
    return (
      <div className="msg-in flex justify-center">
        <span className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm", missed ? "border-brand/30 bg-brand-soft text-brand" : "border-line bg-surface text-ink-2")}>
          <Icon className="size-3.5" /> {m.text} <span className="text-muted tabular">{time}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={cn("msg-in flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[70%]")}>
        {m.kind === "VIDEO_NOTE" && m.mediaId ? (
          <VideoNoteBubble mediaId={m.mediaId} seconds={m.durationSec ?? 0} />
        ) : (
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line shadow-sm",
            mine ? "rounded-br-md text-white" : "rounded-bl-md border border-line bg-surface text-ink",
          )}
          style={mine ? { background: grad } : undefined}
        >
          {m.kind === "VOICE" && m.mediaId ? <VoiceBubble id={m.id} mediaId={m.mediaId} seconds={m.durationSec ?? 0} mine={mine} /> : m.text}
        </div>
        )}
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
      <Badge tone={s.tone} className="px-1.5 py-0 text-[11px]">
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

/** Тирезаи «Маълумот дар бораи корманд» — бо пахши аватар ё ном дар сарлавҳаи чат. */
function ContactInfoView({ id }: { id: number }) {
  const { data, error } = useApi<ContactInfo>(`/messages/contacts/${id}`);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Skeleton className="h-72" />;
  const rows: { icon: React.ReactNode; label: string; value: string; href?: string; color?: string }[] = [
    { icon: <Phone className="size-4" />, label: tr("Телефон"), value: data.phone, href: `tel:${data.phone.replace(/\s/g, "")}` },
    { icon: <WhatsAppIcon className="size-4" />, label: "WhatsApp", value: data.whatsapp || data.phone, href: whatsappLink(data.whatsapp || data.phone), color: "#1fa855" },
    {
      icon: <TelegramIcon className="size-4" />,
      label: "Telegram",
      value: `${data.telegram ? (/^[a-z]/i.test(data.telegram) ? "@" + data.telegram : data.telegram) : data.phone}${data.telegramLinked ? " · " + stripEmoji(tr("бот пайваст ✅")) : ""}`,
      href: telegramLink(data.telegram || data.phone),
      color: "#229ed9",
    },
    { icon: <Mail className="size-4" />, label: tr("Почта"), value: data.email, href: `mailto:${data.email}` },
    { icon: <Briefcase className="size-4" />, label: tr("Вазифа"), value: roleOf(data) },
    { icon: <Building2 className="size-4" />, label: tr("Филиал"), value: data.branchName ?? tr("Ҳамаи филиалҳо") },
    { icon: <CalendarDays className="size-4" />, label: tr("Аз санаи"), value: new Date(data.hiredAt).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }) },
    ...(data.salary !== null
      ? [{ icon: <Wallet className="size-4" />, label: tr("Маош"), value: `${money(data.salary)}${data.payDay ? " · " + tr("рӯзи {0}-уми моҳ", data.payDay) : ""}` }]
      : []),
  ];
  return (
    <div>
      <div className="mb-5 flex flex-col items-center text-center">
        <Avatar name={data.fullName} size={84} />
        <div className="mt-3 text-xl font-bold text-ink">{data.fullName}</div>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          <Badge tone="brand">{roleOf(data)}</Badge>
          <Badge tone={data.isActive ? "good" : "neutral"}>{data.isActive ? tr("Фаъол") : tr("Ғайрифаъол")}</Badge>
        </div>
      </div>
      <ul className="stagger space-y-2">
        {rows.map((r) => (
          <li key={r.label}>
            {r.href ? (
              <a
                href={r.href}
                target={r.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 transition hover:bg-brand-soft"
              >
                <span className="text-muted" style={r.color ? { color: r.color } : undefined}>
                  {r.icon}
                </span>
                <span className="text-sm text-muted">{r.label}</span>
                <span className="ml-auto truncate text-sm font-semibold text-ink">{r.value}</span>
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <span className="text-muted">{r.icon}</span>
                <span className="text-sm text-muted">{r.label}</span>
                <span className="ml-auto truncate text-sm font-semibold text-ink">{r.value}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
