import { useId } from "react";

/**
 * Логотипи FilialHub (аз дизайн): филиалҳо ҳамчун гиреҳҳо, ки ба маркази ягона пайвастанд.
 * gradient — сурх→норанҷӣ; solid — сурхи якранг; dark — заминаи сиёҳ бо маркази норанҷӣ.
 */
export function BrandMark({ className = "size-9", solid, dark }: { className?: string; solid?: boolean; dark?: boolean }) {
  const id = useId();
  const fill = dark ? "#16120F" : solid ? "#DC3B1C" : `url(#${id})`;
  return (
    <svg viewBox="0 0 36 36" className={`shrink-0 ${className}`} aria-hidden>
      {!solid && !dark && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#DC3B1C" />
            <stop offset="1" stopColor="#FF7A1A" />
          </linearGradient>
        </defs>
      )}
      <rect width="36" height="36" rx="10" fill={fill} />
      <path d="M9 10L18 18L27 10M18 18V28" stroke="#fff" strokeWidth="2" fill="none" />
      <circle cx="18" cy="18" r="4.5" fill={dark ? "#FF7A1A" : "#fff"} />
      <circle cx="9" cy="10" r="2.6" fill="#fff" />
      <circle cx="27" cy="10" r="2.6" fill="#fff" />
      <circle cx="18" cy="28" r="2.6" fill="#fff" />
    </svg>
  );
}
