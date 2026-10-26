"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Эффектҳои умумӣ барои тамоми сайт (як бор дар layout):
 * — нури пайрави курсор дар .card (--mx/--my);
 * — хами 3D дар [data-tilt] (--rx/--ry);
 * — мавҷи пахш дар .fx-btn;
 * — пайдошавӣ ҳангоми скролл дар [data-reveal].
 * Ҳеҷ чиз намекашад — танҳо тағйирёбандаҳои CSS ва синфҳо; дар prefers-reduced-motion CSS онҳоро хомӯш мекунад.
 */
export function MotionFX() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;
    let tilted: HTMLElement | null = null;

    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const target = e.target as Element | null;
      const card = target?.closest?.<HTMLElement>(".card");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const tilt = target?.closest?.<HTMLElement>("[data-tilt]") ?? null;
      if (tilted && tilted !== tilt) resetTilt(tilted);
      tilted = tilt;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const max = Number(tilt.dataset.tilt) || 8;
        tilt.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
        tilt.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
      }
    };
    const resetTilt = (el: HTMLElement) => {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (tilted) resetTilt(tilted);
      tilted = null;
    };
    const onDown = (e: PointerEvent) => {
      const btn = (e.target as Element | null)?.closest?.<HTMLElement>(".fx-btn");
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const span = document.createElement("span");
      span.className = "fx-ripple";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - r.left}px`;
      span.style.top = `${e.clientY - r.top}px`;
      btn.appendChild(span);
      setTimeout(() => span.remove(), 700);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Пайдошавӣ ҳангоми скролл: элементҳои нав пас аз ҳар гузариш ва ҳар тағйири DOM пайдо мешаванд
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
