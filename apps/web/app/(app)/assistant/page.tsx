"use client";

import { SendHorizontal, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, cn, ErrorBox, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";

type Turn = { role: "user" | "assistant"; content: string };

/** Ба сервер танҳо охирин паёмҳо фиристода мешаванд (API ҳадди 30 дорад) */
const KEEP = 20;

const SAMPLES = [
  "Ин ҳафта кадом филиал беҳтар фурӯхт?",
  "Кӣ имрӯз дер омад?",
  "Кадом мизоҷон қарзашонро сари вақт надоданд?",
  "Кадом мол ба зудӣ тамом мешавад?",
  "Дирӯз касса фарқ дошт?",
];

export default function AssistantPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next = [...turns, { role: "user" as const, content: q }];
    setTurns(next);
    setText("");
    setError(null);
    setBusy(true);
    try {
      // Таърих бояд бо паёми корбар сар шавад
      let history = next.slice(-KEEP);
      if (history[0]?.role !== "user") history = history.slice(1);
      const { reply } = await api<{ reply: string }>("/ai/assistant", { method: "POST", json: { messages: history } });
      setTurns([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Хато"));
      setTurns(turns);
      setText(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={tr("Ёрдамчии AI")}
        subtitle={tr("Дар бораи фурӯш, кормандон, қарз, анбор ва касса бо забони одӣ пурсед")}
        actions={
          turns.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTurns([])}>
              <Trash2 className="size-4" /> {tr("Чати нав")}
            </Button>
          )
        }
      />

      <Card className="flex min-h-[60vh] flex-col gap-4">
        <div className="flex flex-1 flex-col gap-3">
          {turns.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
              <span className="brand-gradient grid size-14 place-items-center rounded-2xl text-white">
                <Sparkles className="size-7" />
              </span>
              <p className="max-w-md text-sm text-muted">{tr("Масалан, пурсед:")}</p>
              <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(tr(s))}
                    className="cursor-pointer rounded-full border-[1.5px] border-line bg-surface px-4 py-2 text-sm text-ink transition hover:border-brand"
                  >
                    {tr(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
                  t.role === "user" ? "brand-gradient text-white" : "bg-surface-2 text-ink",
                )}
              >
                {t.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">{tr("Ҷавоб омода мешавад…")}</div>
            </div>
          )}
          <div ref={bottom} />
        </div>

        <ErrorBox message={error} />

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(text);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={tr("Саволи худро нависед…")}
            className="max-h-40 min-h-12 flex-1 resize-none rounded-[14px] border-[1.5px] border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft"
          />
          <Button type="submit" loading={busy} disabled={!text.trim()} aria-label={tr("Фиристодан")}>
            <SendHorizontal className="size-5" />
          </Button>
        </form>
      </Card>
    </>
  );
}
