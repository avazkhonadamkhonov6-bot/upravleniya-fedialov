"use client";

import { POSITION_LABELS, ROLE_LABELS, type User } from "@filialhub/shared";
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  HeartHandshake,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";
import { AlertsBell } from "./alerts-bell";
import { CommandPalette } from "./command-palette";
import { LangSwitcher } from "./lang-switcher";
import { ShiftButton } from "./shift-button";
import { Avatar, cn } from "./ui";
import { tr } from "@/lib/i18n";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (u: User) => boolean;
  /** Дар менюи поёни мобилӣ нишон дода шавад */
  primary?: boolean;
}

const canSell = (u: User) => u.role !== "STAFF" || u.position === "WAITER";
const isLead = (u: User) => u.role !== "STAFF";

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Асосӣ",
    items: [
      { href: "/dashboard", label: "Панели асосӣ", short: "Панел", icon: LayoutDashboard, show: () => true, primary: true },
      { href: "/branches", label: "Филиалҳо", short: "Филиалҳо", icon: Building2, show: (u) => u.role === "CHEF" },
      { href: "/branches/view", label: "Филиали ман", short: "Филиал", icon: Building2, show: (u) => u.role === "MANAGER" },
      { href: "/staff", label: "Кормандон", short: "Кормандон", icon: Users, show: isLead },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/customers", label: "Мизоҷон ва бонус", short: "Мизоҷон", icon: HeartHandshake, show: isLead, primary: true },
      { href: "/tasks", label: "Вазифаҳо", short: "Вазифа", icon: ClipboardList, show: () => true, primary: true },
      { href: "/schedule", label: "Ҷадвал ва давомот", short: "Ҷадвал", icon: CalendarClock, show: () => true },
    ],
  },
  {
    title: "Фурӯш",
    items: [
      { href: "/pos", label: "Фурӯши нав", short: "Фурӯш", icon: ShoppingBag, show: canSell, primary: true },
      { href: "/sales", label: "Таърихи фурӯш", short: "Таърих", icon: BarChart3, show: canSell },
      { href: "/products", label: "Меню ва нархҳо", short: "Меню", icon: UtensilsCrossed, show: () => true },
    ],
  },
  {
    title: "Молия ва система",
    items: [
      { href: "/expenses", label: "Хароҷот ва фоидаи соф", short: "Хароҷот", icon: Wallet, show: isLead },
      { href: "/integrations", label: "Telegram & WhatsApp", short: "Боти", icon: MessageCircle, show: (u) => u.role === "CHEF" },
      { href: "/audit", label: "Таърихи амалҳо", short: "Амалҳо", icon: History, show: (u) => u.role === "CHEF" },
      { href: "/profile", label: "Профил", short: "Профил", icon: UserRound, show: () => true },
    ],
  },
];

// Мавзӯъ дар атрибути data-theme-и <html> нигоҳ дошта мешавад; хук онро бо useSyncExternalStore мехонад.
const THEME_EVENT = "fh-theme-change";
const subscribeTheme = (cb: () => void) => {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
};
const readTheme = (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("fh-theme", next);
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return { theme, toggle };
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="brand-gradient grid size-10 place-items-center rounded-2xl text-xl shadow-lg shadow-red-500/30">🍗</div>
      <div className="leading-tight">
        <div className={cn("text-lg font-extrabold tracking-tight", light ? "text-white" : "text-ink")}>FilialHub</div>
        <div className={cn("text-[11px] font-medium", light ? "text-white/50" : "hidden text-muted sm:block")}>{tr("CRM · идоракунии филиалҳо")}</div>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/branches") return pathname === "/branches" || (pathname.startsWith("/branches/") && pathname !== "/branches/view");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || !user) {
    // Саҳифа рендер мешавад (Next.js онро барои instant navigation месанҷад), вале то санҷиши воридшавӣ пинҳон аст.
    return (
      <>
        <div className="grid min-h-screen place-items-center">
          <div className="brand-gradient size-12 animate-pulse rounded-2xl" />
        </div>
        <div hidden>{children}</div>
      </>
    );
  }

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((n) => n.show(user)) })).filter((g) => g.items.length);
  const all = groups.flatMap((g) => g.items);
  const primary = all.filter((n) => n.primary).slice(0, 4);
  const roleLabel = user.position ? tr(POSITION_LABELS[user.position]) : tr(ROLE_LABELS[user.role]);
  const current = all.find((n) => isActive(pathname, n.href));

  return (
    <div className="min-h-screen lg:pl-72">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden bg-[#140b0d] lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(228,0,43,0.38),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-[#ff5a36] opacity-10 blur-3xl" />
        <div className="relative px-5 pt-5">
          <Logo light />
        </div>
        <nav className="scrollbar-none relative mt-6 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-white/30 uppercase">{tr(g.title)}</div>
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = isActive(pathname, n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        active ? "nav-active text-white" : "text-white/55 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-lg transition",
                          active ? "brand-gradient text-white shadow-lg shadow-red-500/30" : "bg-white/5 group-hover:bg-white/10",
                        )}
                      >
                        <n.icon className="size-4" />
                      </span>
                      {tr(n.label)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="relative m-3 rounded-2xl border border-white/5 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.fullName} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{user.fullName}</div>
              <div className="truncate text-xs text-white/50">
                {roleLabel}
                {user.branch ? ` · ${user.branch.name.replace("FilialHub ", "")}` : ""}
              </div>
            </div>
            <button
              onClick={logout}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-white/50 transition hover:bg-[#e4002b] hover:text-white"
              aria-label={tr("Баромад")}
              title={tr("Баромад")}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-muted lg:flex">
            {current && <current.icon className="size-4" />}
            <span className="truncate font-medium text-ink-2">{current ? tr(current.label) : "FilialHub"}</span>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted transition hover:border-brand/40 hover:text-ink lg:ml-6 lg:w-80"
            aria-label={tr("Ҷустуҷӯ")}
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{tr("Ҷустуҷӯ…")}</span>
            <span className="ml-auto hidden gap-1 lg:flex">
              <span className="kbd">Ctrl</span>
              <span className="kbd">K</span>
            </span>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            {user.role !== "CHEF" && <ShiftButton compact />}
            <AlertsBell />
            <LangSwitcher />
            <button
              onClick={toggle}
              className="grid size-10 cursor-pointer place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2"
              aria-label={theme === "dark" ? tr("Мавзӯи равшан") : tr("Мавзӯи торик")}
              title={theme === "dark" ? tr("Равшан") : tr("Торик")}
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <main key={pathname} className="page-enter mx-auto max-w-[1400px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex border-t border-line px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primary.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold", active ? "text-brand" : "text-muted")}
            >
              <n.icon className="size-5" />
              {tr(n.short)}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-muted"
        >
          <Menu className="size-5" />
          {tr("Боз")}
        </button>
      </nav>

      {/* Mobile full menu */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="rise absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={user.fullName} size={42} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{user.fullName}</div>
                <div className="truncate text-xs text-muted">{roleLabel}</div>
              </div>
              <button onClick={() => setMoreOpen(false)} className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={tr("Пӯшидан")}>
                <X className="size-5" />
              </button>
            </div>
            {groups.map((g) => (
              <div key={g.title} className="mb-4">
                <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{tr(g.title)}</div>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center text-[11px] font-semibold",
                        isActive(pathname, n.href) ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-ink-2",
                      )}
                    >
                      <n.icon className="size-5" />
                      {tr(n.short)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={logout}
              className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-soft text-sm font-semibold text-brand"
            >
              <LogOut className="size-4" /> {tr("Баромад")}
            </button>
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} links={all} />
    </div>
  );
}
