"use client";

import {
  BUSINESS_TYPE_LABELS,
  canAccess,
  featureOfPath,
  homePath,
  isRestaurant,
  POSITION_LABELS,
  ROLE_LABELS,
  type Feature,
  type Organization,
  type User,
} from "@filialhub/shared";
import {
  BarChart3,
  ChevronsUpDown,
  Building2,
  CalendarClock,
  ClipboardList,
  HeartHandshake,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Moon,
  Package,
  Store,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sun,
  UserRound,
  Users,
  UtensilsCrossed,
  NotebookPen,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, ViewTransition } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AlertsBell } from "./alerts-bell";
import { CommandPalette } from "./command-palette";
import { LangSwitcher } from "./lang-switcher";
import { ShiftButton } from "./shift-button";
import { Avatar, cn } from "./ui";
import { tr } from "@/lib/i18n";
import { BrandMark } from "./brand-mark";
import { BusinessIcon } from "./glyph";
import { PendingBusiness } from "./pending-business";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Кадом имконият (дастрасӣ аз рӯи нақш — packages/shared canAccess) */
  feature: Feature;
  /** Шарти иловагӣ */
  only?: (u: User) => boolean;
  /** Дар менюи поёни мобилӣ нишон дода шавад */
  primary?: boolean;
}

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Платформа",
    items: [{ href: "/admin", label: "Супер-админ", short: "Админ", icon: ShieldCheck, feature: "admin", primary: true }],
  },
  {
    title: "Асосӣ",
    items: [
      { href: "/dashboard", label: "Панели асосӣ", short: "Панел", icon: LayoutDashboard, feature: "dashboard", primary: true },
      { href: "/branches", label: "Филиалҳо", short: "Филиалҳо", icon: Building2, feature: "branches", only: (u) => u.role === "CHEF" },
      { href: "/branches/view", label: "Филиали ман", short: "Филиал", icon: Building2, feature: "branches", only: (u) => u.role === "MANAGER" },
      { href: "/staff", label: "Кормандон", short: "Кормандон", icon: Users, feature: "staff" },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/customers", label: "Мизоҷон ва бонус", short: "Мизоҷон", icon: HeartHandshake, feature: "customers", primary: true },
      { href: "/tasks", label: "Вазифаҳо", short: "Вазифа", icon: ClipboardList, feature: "tasks", primary: true },
      { href: "/schedule", label: "Ҷадвал ва давомот", short: "Ҷадвал", icon: CalendarClock, feature: "schedule" },
      { href: "/messages", label: "Паёмҳо", short: "Паём", icon: MessagesSquare, feature: "messages" },
    ],
  },
  {
    title: "Фурӯш",
    items: [
      { href: "/pos", label: "Фурӯши нав", short: "Фурӯш", icon: ShoppingBag, feature: "pos", primary: true },
      { href: "/online", label: "Фармоишҳои онлайн", short: "Онлайн", icon: Globe, feature: "online" },
      { href: "/sales", label: "Таърихи фурӯш", short: "Таърих", icon: BarChart3, feature: "sales" },
      { href: "/debts", label: "Дафтари қарз", short: "Қарз", icon: NotebookPen, feature: "debts" },
      { href: "/products", label: "Меню ва нархҳо", short: "Меню", icon: UtensilsCrossed, feature: "products" },
    ],
  },
  {
    title: "Молия ва система",
    items: [
      { href: "/expenses", label: "Хароҷот ва фоидаи соф", short: "Хароҷот", icon: Wallet, feature: "expenses" },
      { href: "/integrations", label: "Telegram & WhatsApp", short: "Боти", icon: MessageCircle, feature: "integrations" },
      { href: "/audit", label: "Таърихи амалҳо", short: "Амалҳо", icon: History, feature: "audit" },
      { href: "/profile", label: "Профил", short: "Профил", icon: UserRound, feature: "profile" },
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
  /** Мавзӯъро иваз мекунад; агар браузер View Transitions дошта бошад — мавзӯи нав ҳамчун доира аз тугма паҳн мешавад. */
  const toggle = (e?: React.MouseEvent) => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("fh-theme", next);
      } catch {}
      window.dispatchEvent(new Event(THEME_EVENT));
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    const x = e?.clientX ?? window.innerWidth - 40;
    const y = e?.clientY ?? 32;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    doc
      .startViewTransition(apply)
      .ready.then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 550, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
  };
  return { theme, toggle };
}

/** compact — дар телефон танҳо иконка (барои ҷой дар топбар); org — номи ширкати корбар ва иконаи навъи кор */
export function Logo({ light, compact, org }: { light?: boolean; compact?: boolean; org?: Organization | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {org ? (
        <div className="brand-fire grid size-10 shrink-0 place-items-center rounded-[12px]">
          <BusinessIcon type={org.type} className="size-5 text-white" />
        </div>
      ) : (
        <BrandMark className="size-10" />
      )}
      <div className={cn("min-w-0 leading-tight", compact && "hidden sm:block")}>
        <div className={cn("truncate font-display text-base font-bold tracking-tight", light ? "text-white" : "text-ink")}>{org?.name ?? "FilialHub"}</div>
        <div className={cn("truncate text-[11px] font-medium", light ? "text-[#a89c90]" : "hidden text-muted sm:block")}>
          {org ? `${tr(BUSINESS_TYPE_LABELS[org.type])} · FilialHub` : tr("CRM · идоракунии филиалҳо")}
        </div>
      </div>
    </div>
  );
}

/** Шумораи паёмҳои нохондашуда (ҳар 20 сония нав мешавад) */
function useUnreadMessages(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const pull = () =>
      api<{ count: number }>("/messages/unread")
        .then((r) => alive && setCount(r.count))
        .catch(() => {});
    pull();
    const t = setInterval(pull, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);
  return count;
}

/** «Фирӯз Раҳимзода» → «ФР» */
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function isActive(pathname: string, href: string) {
  if (href === "/branches") return pathname === "/branches" || (pathname.startsWith("/branches/") && pathname !== "/branches/view");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, client, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Бизнеси тасдиқнашуда: ба ҷои панел экрани интизорӣ (супер-админ — ҳамеша панел)
  const approved = !!user && (user.isSuperAdmin || user.organization?.status === "APPROVED");
  const unread = useUnreadMessages(!!user && approved && canAccess(user, "messages"));
  const feature = featureOfPath(pathname);
  const allowed = !user || !feature || canAccess(user, feature);

  useEffect(() => {
    // Мизоҷи онлайн панели ширкатро намебинад — ба бозор
    if (!loading && !user) router.replace(client ? "/shop" : "/login");
  }, [loading, user, client, router]);

  // Саҳифае, ки барои нақш/вазифаи корбар баста аст — ба саҳифаи аввали ӯ мебарем.
  useEffect(() => {
    if (user && !allowed) router.replace(homePath(user));
  }, [user, allowed, router]);

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

  if (!loading && user && !approved) return <PendingBusiness user={user} />;

  if (loading || !user || !allowed) {
    // Саҳифа рендер мешавад (Next.js онро барои instant navigation месанҷад), вале то санҷиши воридшавӣ пинҳон аст.
    return (
      <>
        <div className="grid min-h-screen place-items-center">
          <div className="relative grid size-20 place-items-center">
            <div className="spin-ring absolute inset-0" />
            <div className="pop brand-gradient grid size-12 place-items-center rounded-2xl text-white"><Store className="size-6" /></div>
          </div>
        </div>
        <div hidden>{children}</div>
      </>
    );
  }

  // Мағоза «Меню» надорад — «Маҳсулот»
  const shop = !isRestaurant(user.organization?.type);
  const relabel = (n: NavItem): NavItem =>
    shop && n.href === "/products" ? { ...n, label: "Маҳсулот ва нархҳо", short: "Маҳсулот", icon: Package } : n;
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((n) => canAccess(user, n.feature) && (!n.only || n.only(user))).map(relabel) })).filter((g) => g.items.length);
  const canSearch = canAccess(user, "search");
  const all = groups.flatMap((g) => g.items);
  // Корманд 1–3 саҳифа дорад — ҳамаашро дар менюи поён нишон медиҳем.
  const primary = all.length <= 4 ? all : all.filter((n) => n.primary).slice(0, 4);
  const roleLabel = user.position ? tr(POSITION_LABELS[user.position]) : tr(ROLE_LABELS[user.role]);
  const current = all.find((n) => isActive(pathname, n.href));

  return (
    <div className="min-h-screen lg:pl-72">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden bg-[#16120f] lg:flex">
        <div className="relative flex flex-col gap-4 px-4 pt-5">
          <Link href={homePath(user)} className="flex items-center gap-2.5 px-2">
            <BrandMark className="size-8" />
            <span className="font-display text-[17px] font-bold text-white">FilialHub</span>
          </Link>
          {user.organization && (
            <Link
              href="/profile"
              title={tr("Бизнеси ман")}
              className="flex w-full items-center gap-2.5 rounded-[14px] border border-[#3a2f27] bg-[#241d18] p-2.5 text-left transition hover:border-[#5a4c41]"
            >
              <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-[#dc3b1c] text-sm font-extrabold text-white">
                {user.organization.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">{user.organization.name}</span>
                <span className="block truncate text-xs text-[#a89c90]">{tr(BUSINESS_TYPE_LABELS[user.organization.type])}</span>
              </span>
              <ChevronsUpDown className="size-4 flex-none text-[#a89c90]" />
            </Link>
          )}
        </div>
        <nav className="scrollbar-none relative mt-5 flex-1 space-y-3.5 overflow-y-auto px-3.5 pb-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-0.5 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[#8c8075] uppercase">{tr(g.title)}</div>
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = isActive(pathname, n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      style={{ animationDelay: `${80 + all.indexOf(n) * 35}ms` }}
                      className={cn(
                        "slide-in-left group flex min-h-11 items-center gap-[11px] rounded-xl px-2.5 py-2.5 text-sm font-medium transition",
                        active ? "nav-active font-bold text-white" : "text-[#d9cfc4] hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <n.icon className="size-[19px] flex-none" />
                      <span className="flex-1">{tr(n.label)}</span>
                      {n.href === "/messages" && unread > 0 && (
                        <span key={unread} className={cn("pop grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-extrabold text-[#16120f]", active ? "bg-white" : "bg-[#ff7a1a]")}>
                          {unread}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="relative mx-3.5 mb-4 px-1 py-1.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-[#ffc531] text-sm font-extrabold text-[#16120f]">{initials(user.fullName)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{user.fullName}</div>
              <div className="truncate text-xs text-[#a89c90]">
                {roleLabel}
                {user.branch ? ` · ${user.branch.name.replace("FilialHub ", "")}` : ""}
              </div>
            </div>
            <button
              onClick={logout}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#a89c90] transition hover:bg-[#dc3b1c] hover:text-white"
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
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-[76px] lg:px-7">
          <div className="lg:hidden">
            <Logo compact org={user.organization} />
          </div>
          <div className="hidden min-w-0 flex-col lg:flex">
            <span className="truncate text-xs font-medium text-muted">{user.organization?.name ?? "FilialHub"}</span>
            <span className="truncate font-display text-[19px] font-bold tracking-tight text-ink">{current ? tr(current.label) : "FilialHub"}</span>
          </div>
          {canSearch ? (
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-10 cursor-pointer items-center gap-2.5 rounded-[14px] bg-surface-2 px-3 text-sm font-medium text-muted transition hover:text-ink lg:ml-6 lg:h-11 lg:w-[380px] lg:px-3.5"
            aria-label={tr("Ҷустуҷӯ")}
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{tr("Ҷустуҷӯ…")}</span>
            <span className="ml-auto hidden gap-1 lg:flex">
              <span className="kbd">Ctrl</span>
              <span className="kbd">K</span>
            </span>
          </button>
          ) : (
            <div className="ml-auto" />
          )}
          <div className="flex items-center gap-1 lg:ml-auto">
            {user.role !== "CHEF" && canAccess(user, "schedule") && <ShiftButton compact />}
            {canAccess(user, "alerts") && <AlertsBell />}
            <LangSwitcher />
            <button
              onClick={toggle}
              className="grid size-10 cursor-pointer place-items-center rounded-[14px] border border-line bg-surface text-ink transition hover:border-ink-2/40 lg:size-11"
              aria-label={theme === "dark" ? tr("Мавзӯи равшан") : tr("Мавзӯи торик")}
              title={theme === "dark" ? tr("Равшан") : tr("Торик")}
            >
              <span key={theme} className="pop grid place-items-center">
                {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div key={`progress-${pathname}`} className="route-progress" aria-hidden />
      <div className="aurora" aria-hidden />
      {/* Гузариши саҳифа: кӯҳна бо blur мебарояд, нав аз поён бо blur медарояд (React ViewTransition) */}
      <ViewTransition key={pathname} enter="page-swap" exit="page-swap" default="none">
        <main className="page-enter mx-auto max-w-[1400px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">{children}</main>
      </ViewTransition>

      {/* Mobile bottom nav */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex border-t border-line px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primary.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                active ? "tab-active text-brand" : "text-muted",
              )}
            >
              <n.icon className="size-5" />
              {tr(n.short)}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted"
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
                <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">{tr(g.title)}</div>
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

      {canSearch && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} links={all} />}
    </div>
  );
}
