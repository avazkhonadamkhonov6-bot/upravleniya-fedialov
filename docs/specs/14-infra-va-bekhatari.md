# 14 — Инфрасохтор, амният ва камбудиҳои маълум

## Deploy (Render)

`render.yaml` (Blueprint) ду чиз месозад: **PostgreSQL** (`filialhub-db`) ва **як хидмат** (`filialhub-web`), ки ҳам сайт ва ҳам API-ро иҷро мекунад. Минтақа: Frankfurt.

| Build | Start |
|---|---|
| `npm ci --include=dev && npm run build` | `npm run start:render` = `prisma migrate deploy` → seed (танҳо агар база холӣ бошад) → API дар порти дохилии `4100` (`API_PORT`) + `next start -p $PORT` |

Чаро як хидмат: Render Free дар моҳ **750 соат** медиҳад. Як хидмати доимо бедор ≤ 744 соат аст, ду хидмат — 1488. Сайт `/api/*`-ро ба `http://127.0.0.1:4100` мефиристад (`API_URL`), пас CORS лозим нест ва webhook-ҳо (Telegram, Green-API) ба суроғаи сайт мераванд (`RENDER_EXTERNAL_URL`).

Бедор мондан: API ҳар 10 дақиқа `RENDER_EXTERNAL_URL/api/health`-ро мепурсад (`KEEP_AWAKE=false` — хомӯш), ва `keep-awake.yml` дар GitHub Actions эҳтиёт аст. Ҳар раванди Node ҳадди хотираи 200 МБ дорад (512 МБ-и ройгон).

### Сервери худ (Oracle Cloud Always Free)

4 CPU ва 24 ГБ ройгон, бе хоб ва бе ҳадди соат: `deploy/oracle/` (Docker + Caddy, HTTPS бо sslip.io). Қадамҳо — [deploy/oracle/README.md](../../deploy/oracle/README.md). Deploy-и худкор — `.github/workflows/deploy-oracle.yml` (бе `ORACLE_HOST` ҳеҷ кор намекунад).

### Базаи ройгони доимӣ (Neon)

Базаи Render Free пас аз 30 рӯз нест мешавад. Neon (neon.tech, нақшаи Free, 0,5 ГБ) мӯҳлат надорад:

1. Дар neon.tech лоиҳа созед (минтақа: **AWS Europe Central 1 / Frankfurt** — дар паҳлӯи Render). Connection string-ро бо `?sslmode=require` нусха кунед.
2. Маълумотро гузаронед: Neon Console → **Import data** → «External URL»-и базаи Render-ро гузоред (ё `pg_dump --no-owner --no-acl "$RENDER_URL" | psql "$NEON_URL"`).
3. Дар `render.yaml` блоки `DATABASE_URL`-ро ба `sync: false` иваз кунед, дар Render → filialhub-web → Environment `DATABASE_URL`-и Neon-ро гузоред ва deploy кунед.
4. Пас аз санҷиш блоки `databases:`-ро аз `render.yaml` тоза кунед.

Neon-и ройгон пас аз 5 дақиқаи бекорӣ «мехобад», вале дар ~0,5 сония бедор мешавад — сайт инро ҳис намекунад. Аксҳо ва медиа дар база ҳастанд: агар ба 0,5 ГБ наздик шавад, онҳоро ба Cloudflare R2 (10 ГБ ройгон) гузаронед.

- Миграцияҳо ҳангоми ҳар deploy худкор иҷро мешаванд. Ҳар тағйири `schema.prisma` бояд миграцияи худро дошта бошад (`prisma/migrations/<сана>_<ном>/migration.sql`).
- `API_URL`-и сайт **ҳангоми build** навишта мешавад. Пас аз иваз кардани он «Clear build cache & deploy» лозим аст.
- Санҷиш: `<сайт>/api/health` → `{"ok":true}`.

## Тағйирёбандаҳо (`apps/api/.env.example`)

| Ном | Барои чӣ |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` | имзои токенҳо ва кодҳои Telegram. **Ҳатмӣ дар production** — бе он API сар намешавад |
| `WEB_ORIGIN`, `PORT`, `API_PORT`, `TIMEZONE` | CORS, порт (`API_PORT` аз `PORT` пеш аст — вақте сайт ва API як хидматанд), минтақаи вақт (`Asia/Dushanbe`) |
| `KEEP_AWAKE` | `false` — API суроғаи худро ҳар 10 дақиқа намепурсад (пешфарз: фаъол, агар `RENDER_EXTERNAL_URL` бошад) |
| `WARM_SHOP` | `false` — саҳифаҳои мағозаро гарм намекунад (пешфарз: пас аз оғоз ва ҳар 10 дақиқа саҳифаҳои `/shop` аз sitemap кушода мешаванд, то мизоҷи аввал интизор нашавад) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MODE`, `TELEGRAM_WEBHOOK_URL` | бот |
| `GREENAPI_*` | WhatsApp бе Facebook (ва Partner барои ҳар бизнес) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_TEMPLATE*` | Meta Cloud API |
| `DAILY_REPORT_CRON` | ҳисоботи рӯзона (пешфарз 22:00) |
| `SUPERADMIN_EMAILS`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_PHONE` | супер-админ |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push (ихтиёрӣ — худкор сохта мешаванд) |
| `API_URL` (сайт) | суроғаи API барои rewrite |

## GitHub Actions

| Workflow | Чӣ | Чӣ лозим аст |
|---|---|---|
| `db-backup.yml` | ҳар шаб 02:00 `pg_dump` → рамзгузорӣ бо AES-256 (gpg) → artifact (30 рӯз) | Secrets: `DATABASE_URL` (External URL-и Render), `BACKUP_PASSPHRASE` |
| `keep-awake.yml` | 08:00–18:00 ҳар 10 дақиқа `/api/health`, то Render-и ройгон нахобад | Variable: `SITE_URL` |
| `ci.yml` | ҳар push ва PR: TypeScript, тестҳо, ESLint, build, `npm audit --audit-level=high` | — |

Амнияти вобастагиҳо: `multer` бо `overrides` дар 2.5.0 (ислоҳи осебпазирии high) аст. 2 «moderate» дар `js-yaml`-и Swagger мондаанд (Swagger дар Render хомӯш аст).
TURN барои зангҳо: `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL` (дар `render.yaml`, ҳангоми build).

Барқарор кардани нусха: `gpg -d файл.dump.gpg > db.dump` ва `pg_restore --clean --no-owner -d "<DATABASE_URL>" db.dump`.

## Амният — чӣ ҳаст

| Хатар | Ҳимоя | Дар куҷо |
|---|---|---|
| Ширкат маълумоти ширкати дигарро мебинад | `organizationId` дар ҳар дархост, `scopeBranch`, `ensure…` | ҳамаи сервисҳо, `common/access.ts` |
| Корманди хориҷшуда бо токени кӯҳна | корбар ҳар дафъа аз база гирифта мешавад, `isActive` | `jwt-auth.guard.ts` |
| Сохтани токени қалбакӣ | `JWT_SECRET` ҳатмӣ дар production | `env.ts` |
| Интихоби парол | 8 хато барои почта → 15 дақ; 10 дархост/дақ | `login-limiter.ts`, `@Throttle` |
| Спам ва сарбории API | 300 дархост/дақ барои корбар (аз рӯи токен) ё IP (`x-forwarded-for`) | `core/throttle.ts` |
| Нархи қалбакӣ аз браузер | нарх ва арзиш ҳамеша аз база | `orders.quote`, `shop.prepare` |
| Webhook-и қалбакӣ | сарлавҳаи махфии Telegram, имзои Meta (`timingSafeEqual`), Bearer-и Green-API | `notifications/*-webhook.controller.ts` |
| Дидани қарзи шахси дигар | қарз танҳо тавассути рақами тасдиқшудаи Telegram | `shop.clientDebts` |
| Кассир қарз медиҳад | дархост → тасдиқи менеҷер | `debts/debt-requests.ts` |
| Clickjacking, MIME | `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy` | `next.config.ts` |
| SQL injection | Prisma ва `$queryRaw` бо параметрҳо (tagged template) | — |
| Ду бор сабт шудани фурӯш | `clientRef @unique` | `orders.ts` |

## Камбудиҳои маълум ва маслиҳатҳо

1. **Render-и ройгон:** базаи Render мӯҳлат дорад (ба Neon гузаронед, ниг. боло); нусхаи захиравӣ — `db-backup.yml`. Сервер бо KEEP_AWAKE бедор аст, вале пас аз ҳар deploy ~1–2 дақиқа дастрас нест. 0,1 CPU ва 512 МБ — барои даҳҳо корбари ҳамзамон; барои садҳо нақшаи пулакӣ лозим мешавад.
2. **TURN-сервер нест:** зангҳо дар баъзе шабакаҳои мобилӣ/корпоративӣ пайваст намешаванд. Илова кардани TURN (масалан Cloudflare Calls ё coturn) ин масъаларо ҳал мекунад.
3. **Токен дар `localStorage`:** онро ба cookie-и `HttpOnly` гузаронидан бехатартар аст, ва ин имкон медиҳад, ки саҳифаҳо Server Component шаванд (ROADMAP).
4. **Ҳолатҳо дар хотираи процесс:** SSE, «дар шабака», ҳудуди дархостҳо ва кэшҳо дар як инстанс кор мекунанд. Барои ду инстанси API Redis лозим мешавад.
5. **Мониторинг:** хатоҳо танҳо дар логи Render ҳастанд. Sentry онҳоро бо огоҳинома нишон медиҳад.
6. **Медиа дар база (`bytea`):** барои ҳазорҳо паёми овозӣ нигоҳдории объектӣ (S3/R2) арзонтар аст.
