"use client";

import { Send } from "lucide-react";
import { useApi } from "@/lib/use-api";

/** Пайванд ба боти Telegram: мизоҷ рақамашро мефиристад ва хабарҳои қарз/фармоишро мегирад */
export function TelegramBotCard({ text }: { text: string }) {
  const { data } = useApi<{ bot: string | null }>("/shop/telegram-bot");
  if (!data?.bot) return null;
  return (
    <a
      href={`https://t.me/${data.bot}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-[#229ed9]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#229ed9] text-white">
        <Send className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">@{data.bot}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </a>
  );
}
