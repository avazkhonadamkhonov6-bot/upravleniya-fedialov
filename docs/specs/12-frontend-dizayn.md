# 12 — Сайт (frontend) ва дизайн

## Технологияҳо

Next.js 16 (App Router, `cacheComponents`, `partialPrefetching`, Turbopack), React 19, Tailwind CSS 4, lucide-react (иконкаҳо), Recharts (графикҳо, lazy).
Ҳарф: Manrope. Мавзӯи равшан ва тира (`--brand`, `--ink`, `--surface`… дар `app/globals.css`).

> ⚠️ Next.js-и ин лоиҳа аз версияҳои маъмул фарқ дорад. Пеш аз тағйир `node_modules/next/dist/docs/`-ро хонед (`AGENTS.md`).

## Сохтори саҳифаҳо

| Гурӯҳ | Роҳҳо | Шарҳ |
|---|---|---|
| Ҷамъиятӣ | `/` (лендинг, Server Component, SEO), `/login`, `/register` | |
| Панели корӣ `(app)` | `/dashboard`, `/branches`, `/staff`, `/pos`, `/sales`, `/products`, `/customers`, `/debts`, `/promos`, `/expenses`, `/schedule`, `/tasks`, `/messages`, `/online`, `/online/tables`, `/audit`, `/integrations`, `/profile`, `/admin` | `app/(app)/layout.tsx` → `AppShell` |
| Бозор | `/shop`, `/shop/[store]`, `/shop/cart`, `/shop/orders`, `/shop/profile`, `/ru/shop/[store]` | `components/shop-shell.tsx` |

Саҳифаҳои дохилӣ Client Component ҳастанд, чунки токен дар `localStorage` аст ва сервер онро намебинад.
Онҳо static prerender мешаванд, ва маълумот пас аз воридшавӣ аз API меояд.

## Қисмҳои асосӣ

| Файл | Вазифа |
|---|---|
| `components/shell.tsx` | меню (аз рӯи `canAccess`), менюи поёни телефон, 🔔, ҷустуҷӯ, забон, мавзӯъ, ҳимояи роҳҳо (`homePath`) |
| `components/ui.tsx` | `Button`, `Card`, `Input`, `Modal`, `Badge`, `Avatar`, `Skeleton`, `Empty`, `ErrorBox`, `money()`, `formatDate()` |
| `components/toast.tsx` | огоҳиҳои кӯтоҳ (`useToast`) |
| `components/command-palette.tsx` | ҷустуҷӯи умумӣ (Ctrl+K) |
| `components/calls.tsx` | занги WebRTC, дар ҳар саҳифа |
| `lib/api.ts` | `api<T>(path, { json })`: токен, хатоҳои тоҷикӣ, такрор ҳангоми 429-и прокси, 401 → `/login` |
| `lib/use-api.ts` | `useApi<T>(path)`: бор кардан, `reload`, `error` |
| `lib/events.ts` | як пайвасти SSE барои ҳама: `useServerEvent(type, fn(data))`, `subscribe()` |
| `lib/auth.tsx` | `useAuth()`: корбар ё мизоҷ, баромад |
| `lib/offline-sales.ts` | навбати фурӯши офлайн |
| `lib/push.ts`, `public/sw.js` | Web Push, PWA |

## Забонҳо

- `tr("Матни тоҷикӣ", ...args)` (`lib/i18n.tsx`). Калид худи матни тоҷикӣ аст. Тарҷумаҳо дар `lib/i18n-dict.ts` (≈1250 сатр, `[русӣ, англисӣ]`).
- `{0}`, `{1}` ҷойи қиматҳо ҳастанд. Агар калид нест бошад, матни тоҷикӣ нишон дода мешавад.
- Паёмҳои хатои API ҳам тоҷикӣ ҳастанд ва дар браузер бо `tr` тарҷума мешаванд. Барои ҳамин матни нави хаторо ба луғат илова кунед.
- Калиди такрорӣ дар луғат хатои TypeScript медиҳад (TS1117). Пеш аз илова кардан ҷустуҷӯ кунед.

## PWA ва телефон

`app/manifest.ts`, иконкаҳо (`icon-192/512.png`), `sw.js`. Сайтро ҳамчун барнома насб кардан мумкин аст. Ҳамаи саҳифаҳо дар 375px бе scroll-и паҳлуӣ кор мекунанд.
Панелҳои шинокунанда (🔔) дар телефон бо `fixed inset-x-3` тамоми барро мегиранд.

## Амният дар браузер

`next.config.ts`: `X-Frame-Options: DENY` (iframe манъ аст), `nosniff`, `Referrer-Policy`, `Permissions-Policy` (камера/микрофон танҳо барои худи сайт).

## Дизайн

Тафсилоти пурра дар [DESIGN.md](../DESIGN.md): рангҳо, кунҷҳо, соя, ҳаракат (`rise`, `pop`, `msg-in`, `typing-dot`…), мавзӯи тира, дастрасӣ (`prefers-reduced-motion`).
Рангҳои WhatsApp (`#1fa855`) ва Telegram (`#229ed9`) дар чат айнан аз ҳамон барномаҳо гирифта шудаанд.
