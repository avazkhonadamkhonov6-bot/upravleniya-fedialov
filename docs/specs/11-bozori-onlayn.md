# 11 — Бозори онлайн

## Мақсад

Ҳар бизнес мағозаи онлайни худро дорад (`/shop/<id>`). Мизоҷ мағозаро интихоб мекунад, мол ба сабад мегузорад, фармоиш медиҳад ва ҳолати онро пайгирӣ мекунад.
Дар тарабхона меҳмон QR-и мизро скан мекунад ва бе сабти ном фармоиш медиҳад.

## Саҳифаҳо

| Саҳифа | Чӣ |
|---|---|
| `/shop` | ҳамаи мағозаҳо (филтр аз рӯи навъ) |
| `/shop/[store]` | мағоза: категорияҳо, мол, нарх, акс, баҳо, аксия |
| `/ru/shop/[store]` | ҳамон мағоза ба забони русӣ — барои Google (SEO) |
| `/shop/cart` | сабад, суроға, телефон, нақд/корт, коди тахфиф |
| `/shop/orders` | фармоишҳои ман, бекор кардан, баҳо |
| `/shop/profile` | профил, **қарзи ман** (пас аз Telegram), боти мизоҷон |

Ҳар навъи бизнес услуби худро дорад (`lib/store-theme.ts`, `components/store-view.tsx`): ранг ва ҳолат барои тарабхона, дорухона, либос ва ғ.

## Ҳолатҳои фармоиш

```
NEW ──▶ ACCEPTED ──▶ DELIVERING ──▶ DELIVERED
  └──────────┴──────────────┴──▶ CANCELLED
```

- Мизоҷ фармоиши `NEW`-ро худаш бекор карда метавонад.
- Кассир, фурӯшанда, менеҷер ва шеф ҳолатро дар `/online` иваз мекунанд (`ONLINE_NEXT`). Филиали дигар 403 мегирад.
- **«Расонида шуд»** → фурӯш дар филиал сабт мешавад (ба омор ва фоида медарояд) ва мол аз анбори филиал кам мешавад.
- Баҳо (1–5 ⭐ + матн) пас аз «Расонида шуд». Такрор кардани баҳо онро иваз мекунад.
- Ба мизоҷ ҳолат дар Telegram меравад (агар пайваст бошад), ва ба филиал 🔔 бо SSE «orders».

## Фармоиш аз миз (QR)

- `/online/tables` QR барои ҳар миз месозад (`components/table-qr.tsx`).
- `POST /api/shop/table-orders` ҷамъиятӣ аст (бе сабти ном), танҳо барои тарабхона. **Ҳимоя аз спам:** на зиёда аз 20 фармоиш дар як дақиқа барои як филиал.

## Ҳимоя ва ҳисоб

- Нарх ҳамеша аз база гирифта мешавад, миқдор 0.001–100 000.
- Шумораи кушодани мағоза (`StoreView`) як сабт дар як рӯз аст, ва ҳисобкунии сунъӣ маҳдуд аст (600 дар як дақиқа). Соҳиб онро дар `/online` мебинад (`GET /api/online-orders/visits`).
- Мағозаи бизнеси на-`APPROVED` ё `isPublic = false` дар бозор намеояд.

## API

| Роҳ | Кӣ |
|---|---|
| `GET /api/shop/stores`, `/stores/:id`, `/stores/:id/promo`, `POST /stores/:id/view`, `GET /telegram-bot` | ҷамъиятӣ |
| `POST /api/shop/table-orders` | ҷамъиятӣ (QR) |
| `GET/PATCH /api/shop/me`, `GET /api/shop/orders`, `POST /api/shop/orders`, `POST …/:id/cancel`, `POST …/:id/review`, `GET /api/shop/debts` | мизоҷи онлайн |
| `GET /api/online-orders`, `PATCH /api/online-orders/:id` | кормандони `online` |
| `GET /api/online-orders/visits` | шеф, менеҷер |

## SEO

`app/sitemap.ts`, `robots.ts` (саҳифаҳои дохилӣ `disallow`), `opengraph-image.tsx`, `lib/store-seo.tsx` (JSON-LD барои мағоза), `manifest.ts`, ва саҳифаҳои русӣ `/ru/shop/*`.

## Файлҳо

`apps/api/src/shop/shop.ts`, `apps/web/app/shop/*`, `app/ru/shop`, `app/(app)/online`, `components/shop-shell.tsx`, `store-view.tsx`, `table-qr.tsx`, `visits-card.tsx`, `stars.tsx`, `lib/cart.tsx`, `lib/shop-data.ts`, `lib/store-url.ts`.
