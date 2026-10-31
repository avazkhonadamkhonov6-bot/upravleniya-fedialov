# 01 — Воридшавӣ, нақшҳо ва ҷудоии ширкатҳо

## Мақсад

Ҳар бизнес (`Organization`) маълумоти худро танҳо худаш мебинад. Дар дохили бизнес ҳар корбар танҳо он чизеро мебинад,
ки ба нақш ва вазифаи ӯ лозим аст. Мизоҷони онлайн ҳисоби алоҳида доранд ва ба панели корӣ роҳ надоранд.

## Нақшҳо (`Role`) ва вазифаҳо (`Position`)

| Нақш | Вазифа | Доира |
|---|---|---|
| `CHEF` | — | Тамоми ширкат (ҳамаи филиалҳо) |
| `MANAGER` | — | Як филиал (`User.branchId`) |
| `STAFF` | `CASHIER`, `SELLER` | Филиали худ: фурӯш, фармоиши онлайн, қарз |
| `STAFF` | `WAITER`, `STOREKEEPER` | Рӯйхати мол |
| `STAFF` | `COOK`, `CLEANER` | Профил, ҷадвал ва давомот, вазифаҳо ва чат |
| — | `isSuperAdmin = true` | Платформа: ҳамаи бизнесҳо |

Вазифаҳое, ки дар интихоб пайдо мешаванд, аз навъи бизнес вобастаанд (`positionsFor(type)` дар shared): масалан, тарабхона ошпаз ва официант дорад, мағоза фурӯшанда ва анбордор.

### Кӣ кадом саҳифаро мебинад (`canAccess`, `STAFF_FEATURES` — `packages/shared`)

| Саҳифа (`Feature`) | Шеф | Менеҷер | Кассир | Фурӯшанда | Официант | Анбордор | Ошпаз/Фаррош |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| dashboard, branches, staff, customers, expenses, search | ✅ | ✅ | — | — | — | — | — |
| schedule (корманд — «Ҷадвали ман», Омадам/Рафтам), tasks (худ), messages (менеҷер ва шеф), alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pos, sales, online, debts | ✅ | ✅ | ✅ | ✅ | — | — | — |
| products | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| integrations, audit | ✅ | — | — | — | — | — | — |
| profile, calls | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | танҳо супер-админ |

Саҳифаи аввал пас аз воридшавӣ: `homePath()`. Шеф ва менеҷер ба `/dashboard`, кассир ба `/pos`, официант ба `/products`, дигарон ба `/profile` мераванд.

## Ҳимояи API (4 қабат)

Тартиби guard-ҳо дар `app.module.ts`:

1. **`AppThrottlerGuard`** (`core/throttle.ts`) — ҳудуди дархостҳо ([14](14-infra-va-bekhatari.md)).
2. **`JwtAuthGuard`** (`auth/jwt-auth.guard.ts`) — токенро месанҷад ва **корбарро ҳар дафъа аз база мегирад**.
   Корманди ғайрифаъол (`isActive = false`) фавран 401 мегирад, ҳатто агар токенаш ҳанӯз мӯҳлат дошта бошад.
   Бизнеси на-`APPROVED` танҳо ба роҳҳои `@AllowPending` (профил, рӯйхати бизнесҳо) дастрасӣ дорад.
3. **`RolesGuard`** — `@Roles('CHEF', 'MANAGER')`; `@SuperAdmin()`.
4. **`StaffAccessGuard`** — барои `STAFF`: роҳ бояд `@Feature(...)` дошта бошад ва вазифа ба он дастрасӣ дошта бошад. **Бе `@Feature` баста аст** (default deny).

Пас аз guard-ҳо худи сервис доираро маҳдуд мекунад:

- `scopeBranch(user, requested)` (`common/access.ts`): шеф филиали ширкати худро интихоб мекунад, менеҷер ва корманд ҳамеша дар филиали худ мемонанд. Филиали ширкати дигар 403 медиҳад.
- `branchWhere` / `branchIdList` — филтр барои Prisma ва SQL-и хом. Ҳеҷ гоҳ «ҳама»-ро бармегардонанд, танҳо филиалҳои ширкат.
- Ҳар `findUnique({ id })` пас аз худ `organizationId`-ро месанҷад (`ensure…`, `mine…`). Сабти бегона 404 медиҳад.
- Кормандон арзиши аслӣ ва фоидаро намебинанд (`forViewer` дар orders, products).

## Воридшавӣ

| Роҳ | Чӣ |
|---|---|
| `POST /api/auth/login` | почта + парол → `{ token, user }`. **10 кӯшиш дар як дақиқа** (throttler) ва **8 хато барои як почта → 15 дақиқа баста** (`login-limiter.ts`) |
| `POST /api/auth/register` | бизнеси нав + шеф → бизнес `PENDING` |
| `POST /api/auth/register-client` | мизоҷи онлайн (`Client`), токен бо `kind: 'client'` |
| `GET/PATCH /api/auth/me` | профили худ; почта/парол — танҳо бо пароли ҳозира |
| `GET/POST /api/auth/businesses`, `POST …/:id/switch` | шеф якчанд бизнес дошта метавонад ва байни онҳо мегузарад |

- Токен: JWT, 12 соат, бо `JWT_SECRET`. Дар production бе `JWT_SECRET` API сар намешавад (`env.ts`).
- Дар браузер токен дар `localStorage` (`fh-token`) нигоҳ дошта мешавад. Ҷавоби 401 → баромад ва гузариш ба `/login` (`lib/api.ts`).
- Мизоҷ (`kind: client`) танҳо ба роҳҳои `@ClientOnly` дастрасӣ дорад. Корманд ба `/shop/me` 403 мегирад ва баръакс.

## Супер-админ ва тасдиқи бизнес

- Почтаҳо дар `SUPERADMIN_EMAILS`. Ҳангоми оғоз корбар супер-админ мешавад ё бо `SUPERADMIN_PASSWORD` сохта мешавад (`admin/admin.ts`).
- Ҳолатҳои бизнес: `PENDING → APPROVED | REJECTED`, `APPROVED → BLOCKED`. Сабаб ба соҳиб дар Telegram/WhatsApp фиристода мешавад.
- Дар сайт: `/admin`. Дар бот: `/pending`, `/approve 12`, `/reject 12 сабаб`.

## Таърихи амалҳо (аудит)

`AuditService.log(actor, action, entity, id, summary, branchId)` ҳар тағйири муҳимро сабт мекунад: кӣ, кай ва чӣ.
Хатои сабт ҳеҷ гоҳ амали асосиро вайрон намекунад. Шеф онро дар `/audit` мебинад.
Навъҳо дар `AUDIT_ENTITY_LABELS` ҳастанд. Навъи нав илова кунед, ба он ҷо ҳам илова кунед (саҳифа навъи ношиносро ҳамчун матн нишон медиҳад).

## Файлҳо

`apps/api/src/auth/*`, `common/access.ts`, `core/audit.service.ts`, `admin/admin.ts`, `packages/shared` (`canAccess`, `homePath`),
`apps/web/lib/auth.tsx`, `components/shell.tsx` (меню аз рӯи `canAccess`), `app/login`, `app/register`, `app/(app)/admin`.

## Тестҳо

`common/access.spec.ts` (scopeBranch, branchWhere, ширкати бегона), `auth/login-limiter.spec.ts`.
