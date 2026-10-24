# 🍗 FilialHub

Системаи идоракунии шабакаи филиалҳо (мисли KFC): **шеф** ҳамаи филиалҳоро мебинад,
**менеҷер** танҳо филиали худашро, **кормандон** (ошпаз, официант, фаррош) — профили худашонро.
Фурӯш ва фоида рӯзона / ҳафтаина / моҳона, ҳисобот ба **Telegram** ва **WhatsApp**.

**CRM:** мизоҷон ва бонус (5%, пардохт бо балл дар POS), вазифаҳо (Kanban), ҷадвал ва давомот (омад/рафт, дер омадан),
хароҷот ва фоидаи соф (P&L), таърихи амалҳо, огоҳиномаҳо (🔔) ва ҷустуҷӯи умумӣ (**Ctrl+K**).

| Қисм | Технология |
|---|---|
| `apps/web` | Next.js 16, React 19, Tailwind CSS 4, Recharts, lucide-react |
| `apps/api` | NestJS 11, Prisma 7, PostgreSQL, JWT, @nestjs/schedule |
| `packages/shared` | Типҳо, нақшҳо ва номҳои тоҷикӣ (умумӣ) |

## Оғоз

1. **Насб**
   ```bash
   npm install
   ```
2. **База.** `apps/api/.env.example`-ро ба `apps/api/.env` нусха кунед (агар нест) ва пароли PostgreSQL-ро дар `DATABASE_URL` нависед:
   ```
   DATABASE_URL="postgresql://postgres:ПАРОЛИ_ШУМО@localhost:5432/filialhub"
   ```
3. **Ҷадвалҳо + маълумоти намунавӣ** (5 филиал, 57 корманд, 345 мизоҷ, 90 рӯз фурӯш, смена, хароҷот, вазифаҳо):
   ```bash
   npm run db:setup
   ```
4. **Сар кардан** (API: http://localhost:4100, сайт: http://localhost:3100)
   ```bash
   npm run dev
   ```

### Ҳисобҳои демо (парол: `demo1234`)

| Нақш | Почта |
|---|---|
| 👑 Шеф | `chef@filialhub.tj` |
| 🧑‍💼 Менеҷер | `manager1@filialhub.tj` … `manager5@filialhub.tj` |
| 💵 Кассир — фурӯш, таърих, профил | `cashier@filialhub.tj` |
| 🍽️ Официант — меню, профил | `waiter@filialhub.tj` |
| 👨‍🍳 Ошпаз — профил ва маош | `cook@filialhub.tj` |
| 🧹 Фаррош — профил ва маош | `cleaner@filialhub.tj` |

Кӣ чӣ мебинад — [SPECS.md](SPECS.md) §2. Пешрафт ва хатоҳои ислоҳшуда — [ROADMAP.md](ROADMAP.md), [PLAN.md](PLAN.md) §9.

## ✉️ Чат (WhatsApp ва Telegram)

- Саҳифаи **Паёмҳо** — чати дохилӣ: дар чап суҳбатҳо (бо шумораи нохондашудаҳо), дар рост суҳбат. Enter — фиристодан.
- Ҳар паём дар сайт сабт мешавад ва **нусхааш ба WhatsApp ва/ё Telegram-и корманд** меравад (агар токенҳо гузошта бошанд).
- Корманд дар **Telegram** ба паёми бот ҷавоб нависад — ҷавоб ба ҳамин чати сайт меояд. **WhatsApp** низ ҳамин тавр, пас аз танзими webhook.
- «Ба чанд нафар» — як паём ба якчанд корманд якбора.
- Шеф ба ҳама, менеҷер ба кормандони филиали худ ва шеф, корманд ба менеҷер ва шеф навишта метавонад (ва ба ҳар касе, ки ба ӯ навишта буд, ҷавоб медиҳад).
- Барои фиристодан аз сервер: `TELEGRAM_BOT_TOKEN` (аз @BotFather) ва `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` (Meta). Бе онҳо паёмҳо танҳо дар сайт мемонанд.

## 🏪 Филиалҳо

Дар саҳифаи **Филиалҳо** шеф барои ҳар филиал (имрӯз / ҳафта / моҳ) фурӯш, фоида, хароҷот, фоидаи соф ва
кормандонро аз рӯи вазифа (ошпаз, официант, кассир, фаррош) мебинад; дар боло — ҳамаи филиалҳо якҷоя.

## 🌐 Забонҳо

Сайт бо се забон кор мекунад: **Тоҷикӣ**, **Русский**, **English** — тугмаи 🌐 дар боло (ва дар саҳифаи даромадан).
Забони интихобшуда дар браузер нигоҳ дошта мешавад. Луғат: `apps/web/lib/i18n-dict.ts`
(калид — матни тоҷикӣ, қимат — `[русӣ, англисӣ]`); дар код матнҳо бо `tr("…")` навишта мешаванд.

## ☁️ Backend дар Render (бе `npm run dev`)

> **Ҳолати ҳозира (24.10.2026):** `filialhub-web.onrender.com` кор мекунад, вале API нест —
> `https://filialhub-web.onrender.com/api/health` → «Not Found». Яъне хизмати **filialhub-api** дар Render сохта нашудааст.

**А. Агар ҳоло аз сифр сохтан мехоҳед (тавсия):**

1. Тағйиротро ба GitHub бор кунед (`git push`).
2. [Render](https://dashboard.render.com) → **New → Blueprint** → репозиторий `upravleniya-fedialov` → **Apply**.
   `render.yaml` худкор месозад: **PostgreSQL** + **filialhub-api** + **filialhub-web**.
3. Интизор шавед, то **filialhub-api** «Live» шавад. Ҳангоми аввалин оғоз API миграцияҳоро иҷро мекунад ва агар база холӣ бошад,
   маълумоти намунавӣ месозад (парол `demo1234`). Санҷиш: `https://<номи-api>.onrender.com/api/health` → `{"ok":true,…}`.
4. Суроғаи API-ро нусха кунед (дар болои саҳифаи filialhub-api). **filialhub-web → Environment** → `API_URL` = ҳамин суроға
   (бе `/` дар охир) → **Save** → **Manual Deploy → Clear build cache & deploy**.
   ⚠️ `API_URL` ҳангоми **build** дар сайт навишта мешавад — бе deploy-и нав тағйир таъсир намекунад.
5. Санҷиш: `https://<номи-web>.onrender.com/api/health` ҳам бояд `{"ok":true}` диҳад. Пас ба сайт ворид шавед.

**Б. Агар `filialhub-web` аллакай ҳаст ва танҳо API лозим аст:** New → **PostgreSQL** (Free) → баъд New → **Web Service** → ҳамин репо:

| Майдон | Қимат |
|---|---|
| Build Command | `npm ci --include=dev && npm run build:api` |
| Start Command | `npm run start:prod -w @filialhub/api` |
| Health Check Path | `/api/health` |
| Environment | `NODE_VERSION=22`, `DATABASE_URL` = *Internal Database URL*-и PostgreSQL, `JWT_SECRET` = сатри тасодуфии дароз, `TIMEZONE=Asia/Dushanbe` |

Баъд қадами 4–5-и боло.

**Танҳо сайт дар компютер, backend дар Render:** `apps/web/.env.example`-ро ба `apps/web/.env.local` нусха кунед,
`API_URL`-ро ба суроғаи Render иваз кунед ва:

```bash
npm run dev:web
```

> Render-и ройгон: сервер пас аз 15 дақиқа бекорӣ «хоб» меравад (дархости аввал ~50 сония), базаи ройгон 30 рӯз амал мекунад.

## Telegram ва WhatsApp

Дар `apps/api/.env`:

```
TELEGRAM_BOT_TOKEN="…"          # аз @BotFather
WHATSAPP_TOKEN="…"              # Meta for Developers → WhatsApp → API Setup
WHATSAPP_PHONE_NUMBER_ID="…"
DAILY_REPORT_CRON="0 0 22 * * *" # ҳар рӯз соати 22:00 (Душанбе)
```

- Бе токен ҳама чиз кор мекунад — паёмҳо дар саҳифаи **Telegram & WhatsApp** бо статуси «санҷишӣ» сабт мешаванд.
- Корманд ботро кушода `/start` менависад ва рақамашро мефиристад → ҳисобаш худкор пайваст мешавад.
- Командаҳо: `/today`, `/week`, `/month`, `/branches` (шеф), `/me`.
- Огоҳиномаҳо: хуш омадед ба корманди нав, хабар ба менеҷер ҳангоми тағйири кормандон, ҳисоботи рӯзона.
- WhatsApp Cloud API матни озодро танҳо дар 24 соат пас аз паёми корбар қабул мекунад; барои паёмҳои мунтазам дар Meta template тасдиқ кунед.

## Ҳуқуқҳо

Ҳамаи ҳуқуқҳо дар **API** санҷида мешаванд (`apps/api/src/common/access.ts`, `apps/api/src/auth/staff-access.guard.ts`; қоидаҳо — `canAccess` дар `packages/shared`): менеҷер ҳатто бо дархости
мустақим маълумоти филиали дигарро гирифта наметавонад. Нигаред ба [PLAN.md](PLAN.md) ва [ROADMAP.md](ROADMAP.md).
