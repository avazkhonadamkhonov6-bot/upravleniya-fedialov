"use client";

import { ClipboardList, LogIn, Moon, ShoppingBag, ShoppingCart, Store, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { useAuth } from "@/lib/auth";
import { CartProvider, useCart } from "@/lib/cart";
import { tr } from "@/lib/i18n";
import { LangSwitcher } from "./lang-switcher";
import { useTheme } from "./shell";
import { BrandMark } from "./brand-mark";
import { cn } from "./ui";

const TABS = [
  { href: "/shop", label: "Мағозаҳо", icon: Store },
  { href: "/shop/cart", label: "Сабад", icon: ShoppingCart },
  { href: "/shop/orders", label: "Фармоишҳо", icon: ClipboardList },
  { href: "/shop/profile", label: "Профил", icon: UserRound },
] as const;

function active(pathname: string, href: string) {
  return href === "/shop" ? pathname === "/shop" || pathname.startsWith("/shop/store") : pathname.startsWith(href);
}

/** Қолаби бозори онлайн: дар компютер — менюи боло, дар телефон ва планшет — менюи поён */
export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Frame>{children}</Frame>
    </CartProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { client, user, loading } = useAuth();
  const { count } = useCart();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-8 md:h-[72px]">
          <Link href="/shop" className="flex items-center gap-2.5">
            <BrandMark solid className="size-[34px]" />
            <span className="font-display text-base font-bold whitespace-nowrap text-ink sm:text-lg">
              FilialHub <span className="text-brand">{tr("Бозор")}</span>
            </span>
          </Link>
          <nav className="ml-6 hidden h-full items-stretch gap-1 md:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "relative flex items-center gap-2 border-b-[3px] px-3.5 text-sm transition",
                  active(pathname, t.href) ? "border-brand font-bold text-ink" : "border-transparent font-semibold text-ink-2 hover:text-ink",
                )}
              >
                <span data-cart-target={t.href === "/shop/cart" ? "" : undefined} className="inline-flex">
                  <t.icon className="size-4" />
                </span>{" "}
                {tr(t.label)}
                {t.href === "/shop/cart" && count > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{count}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <LangSwitcher />
            <button
              onClick={toggle}
              className="grid size-10 cursor-pointer place-items-center rounded-[14px] border border-line bg-surface text-ink hover:border-ink-2/40"
              aria-label={theme === "dark" ? tr("Мавзӯи равшан") : tr("Мавзӯи торик")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {!loading && !client && (
              <Link
                href={user ? "/dashboard" : "/login"}
                className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-brand px-3.5 text-sm font-bold text-white"
              >
                <LogIn className="size-4" /> {user ? tr("Панели ман") : tr("Даромадан")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="aurora" aria-hidden />
      <ViewTransition key={pathname} enter="page-swap" exit="page-swap" default="none">
        <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-7">{children}</main>
      </ViewTransition>

      {/* Менюи поён: телефон ва планшет */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((t) => {
            const on = active(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", on ? "text-brand" : "text-muted")}>
                <span data-cart-target={t.href === "/shop/cart" ? "" : undefined} className={cn("grid h-7 w-12 place-items-center rounded-full transition", on && "bg-brand-soft")}>
                  <t.icon className="size-5" />
                </span>
                {tr(t.label)}
                {t.href === "/shop/cart" && count > 0 && (
                  <span className="brand-gradient absolute top-1.5 left-1/2 ml-2 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Барои саҳифаҳое, ки ҳисоби мизоҷ лозим аст */
export function NeedClient({ children }: { children: React.ReactNode }) {
  const { client, user, loading } = useAuth();
  if (loading) return <div className="h-48 skeleton rounded-3xl" />;
  if (client) return <>{children}</>;
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><ShoppingBag className="size-8" /></div>
      <h2 className="mt-4 text-xl font-bold text-ink">{tr("Барои фармоиш ворид шавед")}</h2>
      <p className="mt-2 text-sm text-muted">
        {user ? tr("Шумо ҳамчун корманди ширкат ворид шудаед. Барои харид ҳисоби мизоҷ лозим аст.") : tr("Сабти ном як дақиқа вақт мегирад.")}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/register?as=client" className="brand-gradient inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white">
          {tr("Сабти ном")}
        </Link>
        {!user && (
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink">
            {tr("Даромадан")}
          </Link>
        )}
      </div>
    </div>
  );
}
