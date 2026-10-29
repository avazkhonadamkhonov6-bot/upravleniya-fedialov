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

Топшириқ — [TZ.md](docs/TZ.md). Кӣ чӣ мебинад — [SPECS.md](docs/SPECS.md) §2. Пешрафт ва хатоҳои ислоҳшуда — [ROADMAP.md](docs/ROADMAP.md), [PLAN.md](docs/PLAN.md) §9.

## 🏢 Ширкатҳо (барои ҳар соҳибкор)

- **/register** — ҳар кас аз сифр ширкати худро месозад: ном + навъи кор (тарабхона, мағозаи хӯрокворӣ, либос, сантехника, техника, дорухона, маводи сохтмонӣ, дигар) ва соҳиб (шеф) мешавад.
- Маълумоти ҳар ширкат (филиалҳо, кормандон, маҳсулот, мизоҷон, фурӯш, хароҷот, вазифаҳо, чат) аз ширкатҳои дигар **пурра ҷудо** аст — дар API санҷида мешавад.
- Мағоза: вазифаҳо — фурӯшанда, кассир, анбордор, фаррош; «Маҳсулот ва нархҳо» бо воҳиди ченак (дона, кг, метр…), дар касса миқдори касрӣ (1,5 кг).
- Шеф филиалҳоро илова, таҳрир ва нест мекунад; ном ва навъи корро дар **Профил → Ширкати ман** иваз мекунад.
- Демо: `shop@filialhub.tj` (мағозаи либос), `seller@filialhub.tj` (фурӯшанда).

## 🛡️ Супер-админ (тасдиқи бизнесҳо)

- Бизнеси нав (сабт дар /register ё «Бизнеси нав» дар профил) ҳолати **«Интизори тасдиқ»** дорад: соҳиб танҳо экрани интизорӣ мебинад, мағоза дар бозори онлайн нест, API ба ҷуз профил 403 медиҳад.
- Супер-админ дар **/admin** дархостҳо, ҳамаи бизнесҳо, соҳибон, филиалҳо ва кормандонро мебинад ва **Тасдиқ / Рад / Бастан / Аз нав кушодан** мекунад.
- Хабарҳо ба Telegram (агар пайваст бошад) ва WhatsApp: ба супер-админ — бизнеси нав сабт шуд; ба соҳиб — дархост қабул шуд, тасдиқ, рад ё баста шуд (бо сабаб).
- Бот (Telegram ва WhatsApp) барои супер-админ: `/pending`, `/approve 12`, `/reject 12 сабаб`, `/block 12 сабаб`, `/business 12`.
- Танзим дар `apps/api/.env` (ва дар Render → filialhub-api → Environment): `SUPERADMIN_EMAILS` (бо вергул), `SUPERADMIN_PASSWORD` (камаш 8 аломат, агар ҳисоб нав сохта шавад), `SUPERADMIN_PHONE` (барои WhatsApp). Агар корбар бо ин почта аллакай бошад — танҳо супер-админ мешавад.
- Бизнесҳое, ки пеш аз ин навсозӣ буданд, худкор «Тасдиқшуда» ҳисоб мешаванд.

## 📨 Telegram ва WhatsApp — пайваст кардан (то паёмҳо воқеан раванд)

Бе токенҳо паём фиристода намешавад — танҳо дар лог бо ҳолати `DRY_RUN` сабт мешавад. Ҳолатро дар **/integrations** бинед (`SENT` — рафт, `FAILED` — сабаби хато навишта мешавад).

**Telegram**
1. Дар Telegram ба @BotFather → `/newbot` → токенро гиред.
2. Render → filialhub-api → Environment → `TELEGRAM_BOT_TOKEN` → Save (API аз нав сар мешавад).
3. Дар Render бот худкор **webhook** мегузорад (`RENDER_EXTERNAL_URL`), яъне ҳатто вақте ки сервери ройгон «хоб» аст, паёми Telegram онро бедор мекунад. Дар /integrations «Режим: webhook» бояд бошад.
4. Ҳар корбар: Профил → «WhatsApp ва Telegram» → «Пайваст кардан» (ё ба бот `/start` ва рақами телефон). Telegram ба корбари пайвастнашуда навишта наметавонад.

**WhatsApp бе Facebook (Green-API)**
1. green-api.com → сабти ном → **Create instance** (нақшаи Developer — ройгон).
2. Дар консол QR-ро бо WhatsApp-и телефон скан кунед (WhatsApp → Дастгоҳҳои пайваст → Пайваст кардан).
3. Аз консол `idInstance`, `apiTokenInstance` ва `apiUrl`-ро гиред → Render → filialhub-api → Environment: `GREENAPI_ID_INSTANCE`, `GREENAPI_API_TOKEN`, `GREENAPI_API_URL`.
4. Webhook худкор гузошта мешавад; дар `/integrations` бояд «WhatsApp (Green-API) — пайваст» бошад.
5. Эзоҳ: Green-API норасмӣ аст — WhatsApp метавонад рақамро барои паёмҳои зиёд баста кунад; рақами алоҳидаи ширкатро истифода баред.

**WhatsApp (Meta Cloud API)**
1. developers.facebook.com → My Apps → Create app (Business) → WhatsApp → API Setup.
2. `WHATSAPP_PHONE_NUMBER_ID` ва токенро гиред. Токени муваққатӣ 24 соат кор мекунад — барои доимӣ: Business Settings → System users → токен бо иҷозати `whatsapp_business_messaging` → `WHATSAPP_TOKEN`.
3. Режими санҷишӣ паёмро танҳо ба то 5 рақами тасдиқшуда мефиристад; барои ҳама — рақами воқеии ширкатро илова ва тасдиқ кунед.
4. Meta матни озодро танҳо 24 соат пас аз паёми охирини корбар мегузорад. Барои боқимонда: WhatsApp Manager → Message templates → шаблони нав (категория Utility), матн: `{{1}}` → пас аз тасдиқ номашро ба `WHATSAPP_TEMPLATE` гузоред (`WHATSAPP_TEMPLATE_LANG` — забони шаблон, масалан `ru`). Система аввал матни оддӣ мефиристад, агар Meta рад кунад — худкор бо шаблон.
5. Ҷавобҳо аз WhatsApp ба сайт: Meta → WhatsApp → Configuration → Webhook: `https://<api>/api/whatsapp/webhook`, Verify token = `WHATSAPP_VERIFY_TOKEN`, field `messages`.

Хатои муваққатӣ (шабака, 429, 5xx) дар ҳарду канал то 3 маротиба худкор такрор мешавад.

## 🛍️ Бозори онлайн (барои мизоҷон)

- **/shop** — ҳамаи мағозаҳо ва тарабхонаҳо аз рӯи навъ; мизоҷ аз ҳар мағоза ҷудогона фармоиш медиҳад.
- **/register** → «Мизоҷ» — сабти ном; сипас 4 саҳифа: Мағозаҳо, Сабад, Фармоишҳо (ҳолат: нав → қабул → дар роҳ → гирифта шуд), Профил.
- Ҳар навъи мағоза услуби худро дорад (рангҳо, кунҷҳо, ҳарфҳо, ороиш) — `apps/web/lib/store-theme.ts`.
- Ширкат фармоишҳоро дар **Фармоишҳои онлайн** идора мекунад; «Расонида шуд» ба фурӯш ва фоидаи филиал илова мешавад.
- Шеф дар **Профил → Бизнеси ман** тавсифи мағоза, намоиш дар бозор ва бизнеси нав месозад.
- Демо: `client@filialhub.tj` (мизоҷ), `grocery@filialhub.tj` (мағозаи хӯрокворӣ).

## ✉️ Чат (WhatsApp ва Telegram)

- Зери ҷустуҷӯ ду тугма: **WhatsApp** ва **Telegram** — чатҳо алоҳида; паём ба ҳамон канал меравад.
- 🎤 Паёми овозӣ, 🎥 видеои мудаввар, 📞 занги аудио ва 🎥 видео (WebRTC). Аватарро пахш кунед — маълумоти пурра.
- **Профил → «Пайваст кардани Telegram»** — бо як пахш; «Ба худам паёми санҷишӣ» месанҷад, ки паёмҳо мерасанд.
- Барои фиристодан ба Telegram/WhatsApp дар Render (filialhub-api → Environment): `TELEGRAM_BOT_TOKEN` (аз @BotFather), `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

- Саҳифаи **Паёмҳо** — чати дохилӣ: дар чап суҳбатҳо (бо шумораи нохондашудаҳо), дар рост суҳбат. Enter — фиристодан.
- Ҳар паём дар сайт сабт мешавад ва **нусхааш ба WhatsApp ва/ё Telegram-и корманд** меравад (агар токенҳо гузошта бошанд).
- Корманд дар **Telegram** ё **WhatsApp** ба паёми бот ҷавоб нависад (матн, 🎤 овоз ё 🎥 видео) — ҷавоб ба ҳамин чати сайт меояд. WhatsApp пас аз танзими webhook кор мекунад.
- «Ба чанд нафар» — як паём ба якчанд корманд якбора.
- Шеф ба ҳама, менеҷер ба кормандони филиали худ ва шеф, корманд ба менеҷер ва шеф навишта метавонад (ва ба ҳар касе, ки ба ӯ навишта буд, ҷавоб медиҳад).
- Барои фиристодан аз сервер: `TELEGRAM_BOT_TOKEN` (аз @BotFather) ва `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (Meta). Бе онҳо паёмҳо танҳо дар сайт мемонанд.

## 🏪 Филиалҳо

Дар саҳифаи **Филиалҳо** шеф барои ҳар филиал (имрӯз / ҳафта / моҳ) фурӯш, фоида, хароҷот, фоидаи соф ва
кормандонро аз рӯи вазифа (ошпаз, официант, кассир, фаррош) мебинад; дар боло — ҳамаи филиалҳо якҷоя.

## 🌐 Забонҳо

Сайт бо се забон кор мекунад: **Тоҷикӣ**, **Русский**, **English** — тугмаи 🌐 дар боло (ва дар саҳифаи даромадан).
Забони интихобшуда дар браузер нигоҳ дошта мешавад. Луғат: `apps/web/lib/i18n-dict.ts`
(калид — матни тоҷикӣ, қимат — `[русӣ, англисӣ]`); дар код матнҳо бо `tr("…")` навишта мешаванд.

## ☁️ Backend дар Render (бе `npm run dev`)

> **Ҳолати ҳозира (24.10.2026):** ҳама дар Render кор мекунад —
> сайт: https://filialhub-web.onrender.com · API: https://filialhub-api.onrender.com/api/health · база: `filialhub-db` (Free, Frankfurt).
> ⚠️ Базаи Free дар Render 30 рӯз амал мекунад (то **23.11.2026**) — пеш аз он ба нақшаи пулакӣ гузаред ё базаи навро созед.

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
- Командаҳо (дар Telegram ва WhatsApp): `/today`, `/week`, `/month`, `/branches` (шеф), `/me`, `/help`. Дар WhatsApp бе «/» ҳам: «имрӯз», «ҳафта», «моҳ», «филиалҳо», «ман», «кӯмак».
- **Боти WhatsApp:** Meta → WhatsApp → Configuration → Webhook: Callback URL `https://<api>/api/whatsapp/webhook`, Verify token = `WHATSAPP_VERIFY_TOKEN`, field `messages`. `WHATSAPP_APP_SECRET` (App settings → Basic) — имзои ҳар дархост санҷида мешавад.
- ⚠️ Як токени Telegram — як сервер: агар бот дар Render кор кунад, дар компютер ҳамон токенро нагузоред (Telegram 409 Conflict медиҳад).
- Огоҳиномаҳо: хуш омадед ба корманди нав, хабар ба менеҷер ҳангоми тағйири кормандон, ҳисоботи рӯзона.
- WhatsApp Cloud API матни озодро танҳо дар 24 соат пас аз паёми корбар қабул мекунад; барои паёмҳои мунтазам дар Meta template тасдиқ кунед.

## Ҳуқуқҳо

Ҳамаи ҳуқуқҳо дар **API** санҷида мешаванд (`apps/api/src/common/access.ts`, `apps/api/src/auth/staff-access.guard.ts`; қоидаҳо — `canAccess` дар `packages/shared`): менеҷер ҳатто бо дархости
мустақим маълумоти филиали дигарро гирифта наметавонад. Нигаред ба [PLAN.md](docs/PLAN.md) ва [ROADMAP.md](docs/ROADMAP.md).
