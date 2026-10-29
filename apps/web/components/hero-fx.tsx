"use client";

import { useEffect, useRef } from "react";

/**
 * Сарлавҳаи «зинда»: ҳама чиз аз паси курсор меравад.
 * — --hx/--hy: ҷои курсор (px) барои нури калон;
 * — --px/--py: аз −1 то 1 барои parallax-и иконкаҳо ([data-parallax="чуқурӣ"]);
 * — думи шарораҳо аз паси курсор;
 * — [data-magnetic]: тугма ба курсор кашида мешавад.
 * Дар телефон (бе курсор) ва prefers-reduced-motion кор намекунад.
 */
export function HeroFX({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let lastSpark = 0;
    let last: PointerEvent | null = null;
    const COLORS = ["#ff7a1a", "#f59e0b", "#ec4899", "#a78bfa", "#38bdf8"];

    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const r = root.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      root.style.setProperty("--hx", `${x}px`);
      root.style.setProperty("--hy", `${y}px`);
      root.style.setProperty("--px", ((x / r.width) * 2 - 1).toFixed(3));
      root.style.setProperty("--py", ((y / r.height) * 2 - 1).toFixed(3));

      // Магнит: тугмаи наздик ба курсор кашида мешавад
      root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const b = el.getBoundingClientRect();
        const dx = e.clientX - (b.left + b.width / 2);
        const dy = e.clientY - (b.top + b.height / 2);
        const near = Math.hypot(dx, dy) < Math.max(b.width, b.height);
        el.style.transform = near ? `translate(${dx * 0.22}px, ${dy * 0.3}px)` : "";
      });
    };

    const spark = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastSpark < 28) return;
      lastSpark = now;
      const r = root.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "hero-spark";
      const size = 4 + Math.random() * 7;
      s.style.width = s.style.height = `${size}px`;
      s.style.left = `${e.clientX - r.left - size / 2}px`;
      s.style.top = `${e.clientY - r.top - size / 2}px`;
      s.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      root.appendChild(s);
      const dx = (Math.random() - 0.5) * 60;
      const dy = 20 + Math.random() * 50;
      s.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 0.95 },
          { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 500, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
      ).onfinish = () => s.remove();
      setTimeout(() => s.remove(), 1400);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      root.classList.add("hero-live");
      spark(e);
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      root.classList.remove("hero-live");
      root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => (el.style.transform = ""));
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={ref} className={className}>
      {/* Нури калон, ки аз паси курсор меравад */}
      <div className="hero-spotlight pointer-events-none absolute inset-0" aria-hidden />
      {children}
    </section>
  );
}
