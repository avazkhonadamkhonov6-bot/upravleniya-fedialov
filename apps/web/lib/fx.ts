"use client";

/** Эффектҳои якдафъаина: парвози мол ба сабад ва конфетти. Дар prefers-reduced-motion намеоянд. */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Эмоҷии мол аз тугма ба нишонаи сабад (элементи намоёни [data-cart-target]) мепарад */
export function flyToCart(from: Element | null, emoji: string) {
  if (!from || reduced()) return bumpCart();
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((el) => el.offsetParent !== null);
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "fx-fly";
  el.textContent = emoji;
  const x0 = a.left + a.width / 2 - 17;
  const y0 = a.top + a.height / 2 - 17;
  const dx = b.left + b.width / 2 - 17 - x0;
  const dy = b.top + b.height / 2 - 17 - y0;
  el.style.left = `${x0}px`;
  el.style.top = `${y0}px`;
  document.body.appendChild(el);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.remove();
    bumpCart();
  };
  // Агар варақа пинҳон бошад ва аниматсия наистад — баъд аз 1,2 с ба ҳар ҳол тоза мекунем
  setTimeout(finish, 1200);
  // Камон: аввал боло, баъд ба сабад; хурд шуда, чарх мезанад
  el.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${Math.min(dy, 0) * 0.5 - 90}px) scale(1.25) rotate(-25deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.35) rotate(20deg)`, opacity: 0.6 },
    ],
    { duration: 750, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" },
  ).onfinish = finish;
}

/** Нишонаи сабад «ҷаҳида» мешавад */
export function bumpCart() {
  document.querySelectorAll<HTMLElement>("[data-cart-target]").forEach((el) => {
    el.classList.remove("cart-bump");
    void el.offsetWidth;
    el.classList.add("cart-bump");
  });
}

const COLORS = ["#dc3b1c", "#ff7a1a", "#f59e0b", "#16a34a", "#2563eb", "#ffc531", "#ec4899"];

/** Конфетти аз нуқтаи (x, y) — масалан ҳангоми фиристодани фармоиш */
export function confetti(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 90) {
  if (reduced()) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "fx-confetti";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.background = COLORS[i % COLORS.length];
    if (i % 3 === 0) el.style.borderRadius = "9999px";
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const power = 120 + Math.random() * 320;
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power - 180;
    const spin = (Math.random() - 0.5) * 1080;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx * 1.2}px, ${dy + 520}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 900, easing: "cubic-bezier(0.15, 0.6, 0.4, 1)" },
    ).onfinish = () => el.remove();
    setTimeout(() => el.remove(), 2600);
  }
}
