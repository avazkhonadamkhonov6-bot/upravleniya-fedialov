# 10 — Огоҳиномаҳо ва интегратсияҳо

## 🔔 Огоҳиномаҳои дохили сайт (`Alert`)

`AlertsService.notify(userIds, { icon, title, body, link })` огоҳиномаро сабт мекунад, ба браузер SSE «alerts» мефиристад ва ба телефон push мефиристад.
`notifyBranch(branchId, …, { includeChefs })` ба менеҷерони филиал (ва шефҳо) мефиристад.

Кай меояд: фармоиши онлайни нав, мол кам монд, дархости қарз ва тасдиқи он, вазифаи нав, занги беҷавоб, паём.
Панел: `components/alerts-bell.tsx`. Дар телефон он тамоми бари экранро мегирад, ва дар компютер ба тугма часпида аст.

| Роҳ | Чӣ |
|---|---|
| `GET /api/alerts` | 30-тои охирин + шумораи нохонда |
| `POST /api/alerts/read-all`, `POST /api/alerts/:id/read` | хондан |

## Web Push (огоҳӣ ҳатто вақте ки сайт пӯшида аст)

- `core/push.ts` + `public/sw.js` (Service Worker). Ройгон аст, чунки хидматҳои push-и худи браузерҳо истифода мешаванд.
- Калидҳои VAPID аз `.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) гирифта мешаванд, ё бори аввал худкор сохта ва дар `AppSetting` нигоҳ дошта мешаванд.
- Обунаҳои мурда (404/410) худкор нест мешаванд. Корбар push-ро дар профил фаъол мекунад (`components/push-toggle.tsx`).

## Telegram

Як бот (`TELEGRAM_BOT_TOKEN`) ду гурӯҳро хизмат мекунад:

| Кӣ | Чӣ мекунад | Файл |
|---|---|---|
| Кормандон, шеф, супер-админ | ҳисоботи рӯзона, `/today` `/week` `/month` (ё «имрӯз», «сегодня»), нусхаи паёмҳои чат, вазифаҳо, `/pending` `/approve` барои супер-админ | `bot.service.ts`, `telegram-bot.service.ts` |
| Мизоҷон | мизоҷ рақамашро (контакти худ) мефиристад, ва хабарҳои қарз, пардохт ва ҳолати фармоиш ба ӯ меоянд. «қарз» → қарзи ӯ дар ҳамаи мағозаҳо | `customer-bot.service.ts` |

- Дар Render бот бо **webhook** кор мекунад (`POST /api/telegram/webhook`, сарлавҳаи махфии `X-Telegram-Bot-Api-Secret-Token`). Дар компютер бо **polling**.
- Пайваст кардани корманд: тугмаи «Telegram-ро пайваст кунед» → `https://t.me/<бот>?start=<код>`. Код ба HMAC бо `JWT_SECRET` имзо шудааст (`notifications/telegram-link.ts`).

## WhatsApp

Ду роҳ (`notifications/whatsapp.service.ts`, синфи `GreenApi`):

1. **Green-API** (бе Facebook): WhatsApp-и телефон бо скани QR пайваст мешавад. Бо `GREENAPI_PARTNER_TOKEN` сайт барои ҳар бизнес instance-ро худаш месозад, ва соҳиб дар «Профил» танҳо QR-ро скан мекунад (`components/business-whatsapp.tsx`).
2. **Meta Cloud API**: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. Webhook имзои `X-Hub-Signature-256`-ро бо `WHATSAPP_APP_SECRET` месанҷад. Пас аз 24 соат паём бо шаблон (`WHATSAPP_TEMPLATE`) меравад.

Ҷавобҳо аз WhatsApp ба чати сайт меоянд (`POST /api/whatsapp/webhook`, `/greenapi/:orgId`).

## Саҳифаи «Telegram & WhatsApp» (`/integrations`, танҳо шеф)

Ҳолати ботҳо ва webhook, QR, логи охирин паёмҳо, тугмаи «ҳисоботи санҷишӣ» (`/api/integrations/*`).

## Хатоҳои браузер

`lib/report-error.ts` → `POST /api/client-errors` (ҷамъиятӣ, то 60 дар як дақиқа) → логи API бо калимаи `ClientError`.

## Файлҳо

`apps/api/src/core/alerts.service.ts`, `core/push.ts`, `notifications/*` (telegram, telegram-bot, telegram-link, whatsapp, business-whatsapp, bot, customer-bot, report, chat, integrations),
`apps/web/components/alerts-bell.tsx`, `push-toggle.tsx`, `channels-card.tsx`, `telegram-bot-card.tsx`, `whatsapp-qr.tsx`, `lib/push.ts`, `public/sw.js`.
