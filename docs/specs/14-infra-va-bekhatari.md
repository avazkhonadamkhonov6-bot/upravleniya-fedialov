# 14 — Инфрасохтор, амният ва камбудиҳои маълум

## Deploy (Render)

`render.yaml` (Blueprint) се хидмат месозад: **PostgreSQL** (`filialhub-db`), **API** (`filialhub-api`), **сайт** (`filialhub-web`). Минтақа: Frankfurt.

| Хидмат | Build | Start |
|---|---|---|
| API | `npm ci --include=dev && npm run build:api` | `npm run start:prod -w @filialhub/api` = `prisma migrate deploy` → seed (танҳо агар база холӣ бошад) → `node dist/main.js` |
| Сайт | `npm ci --include=dev && npm run build:web` | `next start -p $PORT` |

- Миграцияҳо ҳангоми ҳар deploy худкор иҷро мешаванд. Ҳар тағйири `schema.prisma` бояд миграцияи худро дошта бошад (`prisma/migrations/<сана>_<ном>/migration.sql`).
- `API_URL`-и сайт **ҳангоми build** навишта мешавад. Пас аз иваз кардани он «Clear build cache & deploy» лозим аст.
- Санҷиш: `<сайт>/api/health` → `{"ok":true}`.

## Тағйирёбандаҳо (`apps/api/.env.example`)

| Ном | Барои чӣ |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` | имзои токенҳо ва кодҳои Telegram. **Ҳатмӣ дар production** — бе он API сар намешавад |
| `WEB_ORIGIN`, `PORT`, `TIMEZONE` | CORS, порт, минтақаи вақт (`Asia/Dushanbe`) |
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

1. **Render-и ройгон:** база нусхаи захиравии худкор надорад ва мӯҳлат дорад, сервер пас аз 15 дақиқа мехобад (дархости аввал ~50 сония). Барои мизоҷони воқеӣ нақшаи пулакӣ лозим аст.
2. **TURN-сервер нест:** зангҳо дар баъзе шабакаҳои мобилӣ/корпоративӣ пайваст намешаванд. Илова кардани TURN (масалан Cloudflare Calls ё coturn) ин масъаларо ҳал мекунад.
3. **Давомоти кормандон:** роҳҳои `shifts/mine`, `check-in` ва `check-out` барои `STAFF` баста ҳастанд ([08](08-jadval-va-vazifaho.md)).
4. **Токен дар `localStorage`:** онро ба cookie-и `HttpOnly` гузаронидан бехатартар аст, ва ин имкон медиҳад, ки саҳифаҳо Server Component шаванд (ROADMAP).
5. **Ҳолатҳо дар хотираи процесс:** SSE, «дар шабака», ҳудуди дархостҳо ва кэшҳо дар як инстанс кор мекунанд. Барои ду инстанси API Redis лозим мешавад.
6. **Мониторинг:** хатоҳо танҳо дар логи Render ҳастанд. Sentry онҳоро бо огоҳинома нишон медиҳад.
7. **Медиа дар база (`bytea`):** барои ҳазорҳо паёми овозӣ нигоҳдории объектӣ (S3/R2) арзонтар аст.
