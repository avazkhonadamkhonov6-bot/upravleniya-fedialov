"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { cn } from "./ui";

/** Ситораҳо барои нишон додан (4,5 → чор пур, як нимпур намегузорем — яклухт мекунем) */
export function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={tr("Баҳо: {0} аз 5", value)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(className, i <= full ? "fill-[#ffb400] text-[#ffb400]" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

/** Баҳо додан ба фармоиши расонидашуда (мизоҷ) */
export function ReviewForm({ orderId, initial, accent, onDone }: { orderId: number; initial?: { rating: number; text: string } | null; accent: string; onDone: () => void }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(initial?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!rating) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/shop/orders/${orderId}/review`, { method: "POST", json: { rating, text } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={tr("Баҳои шумо")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={tr("{0} ситора", i)}
            onMouseEnter={() => setHover(i)}
            onClick={() => setRating(i)}
            className="cursor-pointer p-0.5 transition active:scale-90"
          >
            <Star className={cn("size-7", i <= (hover || rating) ? "fill-[#ffb400] text-[#ffb400]" : "text-line")} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={tr("Чӣ писанд омад ё не? (ихтиёрӣ)")}
            className="w-full resize-none rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          {error && <div className="text-xs font-medium text-brand">{error}</div>}
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="h-10 w-full cursor-pointer rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
            style={{ background: accent }}
          >
            {initial ? tr("Баҳоро иваз кардан") : tr("Фиристодан")}
          </button>
        </>
      )}
    </div>
  );
}
