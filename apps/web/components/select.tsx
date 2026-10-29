"use client";

import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Opt = { value: string; label: ReactNode; disabled: boolean };

/** <option>-ҳоро аз children мегирем (ҳатто аз дохили массив ва Fragment) */
function readOptions(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  const walk = (node: ReactNode) =>
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>;
      if (el.type === "option") {
        const label = el.props.children;
        out.push({ value: String(el.props.value ?? (typeof label === "string" ? label : "")), label, disabled: !!el.props.disabled });
      } else if (el.props.children) walk(el.props.children);
    });
  walk(children);
  return out;
}

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

/**
 * Рӯйхати интихоб бо услуби FilialHub (ба ҷои рӯйхати хокистарии браузер).
 * API ҳамон аст: value, onChange(e) бо e.target.value, <option>-ҳо. Барои формаҳо <select>-и пинҳон ҳам ҳаст.
 */
export function StyledSelect({ value, onChange, children, className, disabled, required, name, id, ...rest }: Props) {
  const options = readOptions(children);
  const current = String(value ?? "");
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const up = below < 260 && r.top > below;
    setPos({ left: r.left, top: up ? r.top : r.bottom, width: r.width, up });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false);
    };
    // Ҳангоми скролли саҳифа рӯйхат пӯшида мешавад (ҷояш иваз мешуд); скролл дар худи рӯйхат — не
    const onScroll = (e: Event) => !list.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Банди интихобшуда дар рӯйхат намоён бошад
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(o: Opt) {
    if (o.disabled) return;
    setOpen(false);
    btn.current?.focus();
    if (o.value !== current) onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  }

  function openList() {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const step = (d: number) => {
      let i = active;
      for (let n = 0; n < options.length; n++) {
        i = (i + d + options.length) % options.length;
        if (!options[i].disabled) break;
      }
      setActive(i);
    };
    const moves: Record<string, () => void> = {
      ArrowDown: () => step(1),
      ArrowUp: () => step(-1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
  }

  return (
    <div className={`relative ${/(^|\s)([a-z]+:)?w-/.test(className ?? "") ? "" : "w-full"} ${className ?? ""}`}>
      {/* Барои формаҳо (required, name) ва барои ёрдамчиҳои экран — пинҳон */}
      <select
        tabIndex={-1}
        aria-hidden
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => {}}
        className="pointer-events-none absolute inset-0 opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled} />
        ))}
      </select>
      <button
        ref={btn}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest["aria-label"]}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        className={`relative flex h-12 w-full cursor-pointer items-center gap-2 rounded-[14px] border-[1.5px] bg-surface pr-10 pl-4 text-left text-[15px] text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-brand ring-4 ring-brand-soft" : "border-line hover:border-ink-2/30 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand-soft"
        }`}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{selected?.label ?? ""}</span>
        <ChevronDown className={`pointer-events-none absolute right-3.5 size-4 text-muted transition-transform duration-200 ${open ? "rotate-180 text-brand" : ""}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={rest["aria-label"]}
            onKeyDown={onKey}
            style={{
              position: "fixed",
              left: pos.left,
              width: Math.max(pos.width, 200),
              ...(pos.up ? { bottom: window.innerHeight - pos.top + 6 } : { top: pos.top + 6 }),
            }}
            className="select-pop z-[80] max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_44px_-14px_rgba(22,18,15,0.35)]"
          >
            {options.map((o, i) => {
              const isSel = o.value === current;
              return (
                <li
                  key={o.value + i}
                  data-i={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                    o.disabled ? "cursor-not-allowed opacity-40" : ""
                  } ${isSel ? "bg-brand-soft font-semibold text-brand" : i === active ? "bg-surface-2 text-ink" : "text-ink-2"}`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isSel && <Check className="size-4 shrink-0" strokeWidth={2.6} />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
