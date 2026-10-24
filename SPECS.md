# FilialHub — Мушаххасот (Specs)

Ҳуҷҷати кӯтоҳ: лоиҳа чӣ дорад, кӣ чӣ мебинад, API чӣ гуна кор мекунад ва чӣ гуна санҷида мешавад.
Нақша ва таърих: [PLAN.md](PLAN.md) · Пешрафт: [ROADMAP.md](ROADMAP.md) · Оғоз ва Render: [README.md](README.md).

---

## 1. Лоиҳа дар як нигоҳ

| | |
|---|---|
| Мақсад | CRM барои шабакаи тарабхонаҳо: филиалҳо, кормандон, фурӯш, фоида, мизоҷон, ҷадвал, хароҷот |
| Web | `apps/web` — Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, Recharts |
| API | `apps/api` — NestJS 11, Prisma 7, PostgreSQL, JWT (12 соат), bcrypt |
| Умумӣ | `packages/shared` — типҳо, номҳо, **қоидаҳои дастрасӣ** (`canAccess`), `nextPayDate` |
| Забонҳо | Тоҷикӣ (асосӣ), Русский, English — `apps/web/lib/i18n-dict.ts` |
| Интегратсия | Telegram бот, WhatsApp Cloud API, ҳисоботи рӯзона (cron 22:00) |
| Deploy | Render Blueprint (`render.yaml`): PostgreSQL + `filialhub-api` + `filialhub-web` |

## 2. Нақшҳо ва саҳифаҳо

| Нақш / вазифа | Саҳифаҳо | Саҳифаи аввал |
|---|---|---|
| 👑 Шеф | ҳамаи 16 саҳифа | `/dashboard` |
| 🧑‍💼 Менеҷер | ҳама, ба ғайр аз Telegram & WhatsApp ва Таърихи амалҳо; маълумот — танҳо филиали худ | `/dashboard` |
| 💵 Кассир | `/pos` (фурӯш + сабад), `/sales` (чекҳои худ), `/profile` | `/pos` |
| 🍽️ Официант | `/products` (танҳо нарх), `/profile` | `/products` |
| 👨‍🍳 Ошпаз, 🧹 Фаррош | `/profile` (бо корти «Маош») | `/profile` |

**Идоракунии одамон**

- Шеф: ҳамаи менеҷерҳо ва кормандонро мебинад, илова / таҳрир / нест мекунад, филиал ва нақшро иваз мекунад.
- Менеҷер: танҳо одамони филиали худ (худаш ва кормандон); кормандро илова / таҳрир / нест мекунад; нақш ва филиалро иваз карда наметавонад; менеҷери дигар сохта наметавонад.
- Ҳар кас: профили худро таҳрир мекунад (ном, телефон, WhatsApp, Telegram; почта ва парол — бо пароли ҳозира). Маош ва рӯзи маошро худаш иваз карда наметавонад.

**Маош** — `salary` (сомонӣ/моҳ) ва `payDay` (1–28). Санаи навбатӣ: `nextPayDate(payDay)` — агар имрӯз аз рӯзи маош нагузашта бошад, ҳамин моҳ, вагарна моҳи оянда.

## 3. Ҳимоя (чӣ гуна кор мекунад)

```
Дархост → JwtAuthGuard (токен + корбари фаъол аз база)
        → RolesGuard (@Roles: CHEF / MANAGER / STAFF)
        → StaffAccessGuard (@Feature: корманд танҳо саҳифаҳои вазифаи худ)
        → Service (scopeBranch: менеҷер/корманд — танҳо филиали худ)
```

- `@Feature` дар маршрут нест → корманд **403** мегирад (default deny). Шеф ва менеҷерро танҳо `@Roles` ва `scopeBranch` маҳдуд мекунанд.
- Сайт ҳамон `canAccess`-ро истифода мебарад: меню, менюи поёни телефон, зангӯла, ҷустуҷӯ ва ҳимояи роҳҳо (`AppShell` → `homePath`).
- Кормандон арзиши аслӣ ва фоидаро намебинанд (`products`, `orders` → `cost = 0`).

## 4. API (кӯтоҳ)

| Маршрут | Шеф | Менеҷер | Кассир | Официант | Ошпаз/Фаррош | `@Feature` |
|---|:-:|:-:|:-:|:-:|:-:|---|
| `POST /auth/login`, `GET /health` | ✅ | ✅ | ✅ | ✅ | ✅ | ҷамъиятӣ |
| `GET/PATCH /auth/me` | ✅ | ✅ | ✅ | ✅ | ✅ | profile |
| `GET /products` | ✅ | ✅ | ✅ | ✅ | ❌ | products, pos |
| `POST/PATCH/DELETE /products` | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| `GET/POST /orders` | ✅ | ✅ филиал | ✅ худ | ❌ | ❌ | pos, sales |
| `GET /customers/lookup`, `POST /customers` | ✅ | ✅ | ✅ | ❌ | ❌ | pos |
| `/users` | ✅ | ✅ филиал | ❌ | ❌ | ❌ | — |
| `/branches` | ✅ | 👁 худ | ❌ | ❌ | ❌ | — |
| `/stats/*`, `/customers`, `/tasks`, `/shifts`, `/expenses`, `/messages`, `/alerts`, `/search` | ✅ | ✅ филиал | ❌ | ❌ | ❌ | — |
| `/audit`, `/integrations` | ✅ | ❌ | ❌ | ❌ | ❌ | — |

Хатоҳо: `400` (маълумоти нодуруст, масалан `payDay` берун аз 1–28), `401` (токен нест/кӯҳна), `403` (ҳуқуқ нест), `404`, `409` (почта такрор, филиал аллакай менеҷер дорад).

## 5. Модели маълумот (тағйироти версияи 3)

- `User.payDay Int @default(1)` — миграцияи `20261024200000_payday`.
- Ҳамаи моделҳо: `Branch`, `User`, `Product`, `Order`, `OrderItem`, `Customer`, `Task`, `Shift`, `Expense`, `AuditLog`, `Alert`, `Notification`, `Message` — `apps/api/prisma/schema.prisma`.

## 6. Суръат ва SEO

- API (локалӣ, гарм): ҳамаи дархостҳо **5–30 мс**, gzip; индексҳо дар `Order(branchId, createdAt)`, `User(branchId)` ва ғ.
- Web: ҳамаи 23 роҳ **static prerender** мешаванд (HTML-и тайёр), маълумот пас аз воридшавӣ аз API меояд; графикҳо lazy.
- `/` — Server Component бо мундариҷаи пурра (бе JavaScript-и иловагӣ), `metadata`, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt` (саҳифаҳои дохилӣ `disallow`), `manifest`.
- Чаро саҳифаҳои дохилӣ ҳоло Client Component-анд: токен дар `localStorage` аст, сервер онро намебинад. Барои гузаштан ба Server Components — auth бо cookie (ROADMAP, марҳилаи 8).
- Render-и ройгон: пас аз 15 дақ бекорӣ сервер хоб меравад — дархости аввал ~50 сония (дар санҷиш: 54 сония).

## 7. Санҷиш

| Чӣ | Чӣ гуна | Натиҷа |
|---|---|---|
| Дастрасӣ | 6 ҳисоби демо × 16 маршрут | 96/96 ✅ |
| Навиштан | илова/таҳрир/нест, филиали бегона, профил, рӯзи маош, фурӯш | 22/22 ✅ |
| Саҳифаҳо | шеф 16, менеҷер 15, официант 7 — бе хато, роҳҳои баста → саҳифаи аввал | ✅ |
| Телефон | ҳамаи саҳифаҳо дар 375px бе scroll ба тараф | ✅ |
| Сифати код | `eslint`, `tsc` (api, web), `build:api`, `build:web` | ✅ |

**Ҳисобҳои демо** (парол `demo1234`): `chef@`, `manager1@` … `manager5@`, `cashier@`, `waiter@`, `cook@`, `cleaner@filialhub.tj`.
