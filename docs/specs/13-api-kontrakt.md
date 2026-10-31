# 13 — Контракти API

Ҳамаи **141 роҳ** аз контроллерҳо ҷамъ шудаанд (`apps/api/src/**/*.ts`: `@Controller` + `@Get/@Post/…` ва декораторҳои дастрасӣ).
Префикс: `/api`. Формат: JSON (ба ҷуз Excel, медиа ва SSE). Воридшавӣ: `Authorization: Bearer <token>`.

## Қоидаҳои умумӣ

- Ҳар роҳ, ба ҷуз `@Public`, токен талаб мекунад. `@ClientOnly` танҳо барои мизоҷи онлайн аст.
- Корманди `STAFF` танҳо роҳҳои `@Feature`-и вазифаи худро мекушояд. Роҳи бе `@Feature` барои ӯ баста аст ([01](01-auth-va-naqshho.md)).
- Агар декоратор ҳам дар синф ва ҳам дар метод бошад, **методӣ бартарӣ дорад** (`getAllAndOverride`). Дар ҷадвал аввал синф, баъд метод навишта шудааст.
- Ғайр аз декораторҳо, сервис доираро маҳдуд мекунад (`scopeBranch`, `organizationId`, `debtScope`). Сутуни «Дастрасӣ» хулосаи ҳардуи онҳост.
- Маълумоти воридшаванда бо `class-validator` санҷида мешавад (`whitelist: true`): майдонҳои бегона партофта мешаванд.
- Ҳудуди дархостҳо: 300 дар як дақиқа барои як корбар/IP; воридшавӣ ва сабти ном 10 дар як дақиқа (`@Throttle`); `@SkipThrottle` — бе ҳудуд.

| Код | Маъно |
|---|---|
| 400 | маълумоти нодуруст (`message` — матни тоҷикӣ ё рӯйхати онҳо) |
| 401 | токен нест, кӯҳна, ё корбар ғайрифаъол |
| 403 | ҳуқуқ нест, ширкат/филиали бегона, бизнес тасдиқ нашудааст |
| 404 | ёфт нашуд (сабти ширкати бегона ҳам 404 медиҳад) |
| 409 | такрор (почта, менеҷери дуюм дар филиал) |
| 429 | дархостҳо аз ҳад зиёданд |

## Рӯйдодҳои фаврӣ (SSE)

`GET /api/events`: `event: <навъ>` + `data: <JSON>`. Ҳар 25 сония `: ping` фиристода мешавад.

| Навъ | data | Кай |
|---|---|---|
| `messages` | `{}` | паёми нав |
| `calls` | `{}` | занг |
| `alerts` | `{}` | 🔔 нав |
| `orders` | `{}` | фармоиши онлайн |
| `debts` | `{}` | дархости қарз ё тасдиқ |
| `activity` | `{ fromId, kind }`, kind: `typing`, `recording`, `video`, `stop` | ҳамсуҳбат менависад/сабт мекунад |
| `presence` | `{ userId, online, lastSeenAt }` | ҳамкор сайтро кушод/баст |

## Ҳамаи роҳҳо

### `admin/admin.ts`

Дастрасӣ: 🛡️ супер-админ

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/admin/overview` | `@Feature(admin)` `@SuperAdmin` |
| GET | `/api/admin/businesses` | `@Feature(admin)` `@SuperAdmin` |
| GET | `/api/admin/businesses/:id` | `@Feature(admin)` `@SuperAdmin` |
| POST | `/api/admin/businesses/:id/approve` | `@Feature(admin)` `@SuperAdmin` |
| POST | `/api/admin/businesses/:id/reject` | `@Feature(admin)` `@SuperAdmin` |
| POST | `/api/admin/businesses/:id/block` | `@Feature(admin)` `@SuperAdmin` |

### `auth/auth.controller.ts`

Дастрасӣ: ҷамъиятӣ / ҳар корбар (худ); ташкилот — шеф

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| POST | `/api/auth/login` | `@Feature(profile)` `@Public` `@Throttle` |
| POST | `/api/auth/register` | `@Feature(profile)` `@Public` `@Throttle` |
| POST | `/api/auth/register-client` | `@Feature(profile)` `@Public` `@Throttle` |
| GET | `/api/auth/businesses` | `@Feature(profile)` `@AllowPending` `@Roles(CHEF)` |
| POST | `/api/auth/businesses` | `@Feature(profile)` `@AllowPending` `@Roles(CHEF)` |
| POST | `/api/auth/businesses/:id/switch` | `@Feature(profile)` `@AllowPending` `@Roles(CHEF)` |
| GET | `/api/auth/organization` | `@Feature(profile)` `@AllowPending` |
| PATCH | `/api/auth/organization` | `@Feature(profile)` `@Roles(CHEF)` |
| GET | `/api/auth/me` | `@Feature(profile)` `@AllowPending` |
| PATCH | `/api/auth/me` | `@Feature(profile)` `@AllowPending` |

### `branches/branches.controller.ts`

Дастрасӣ: шеф; менеҷер — танҳо хондани филиали худ

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/branches` |  |
| GET | `/api/branches/:id` |  |
| POST | `/api/branches` | `@Roles(CHEF)` |
| PATCH | `/api/branches/:id` | `@Roles(CHEF)` |
| DELETE | `/api/branches/:id` | `@Roles(CHEF)` |

### `calls/calls.ts`

Дастрасӣ: ҳар корманд (`calls`)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| POST | `/api/calls` | `@Feature(calls)` |
| GET | `/api/calls/incoming` | `@Feature(calls)` |
| GET | `/api/calls/:id` | `@Feature(calls)` |
| POST | `/api/calls/:id/answer` | `@Feature(calls)` |
| POST | `/api/calls/:id/decline` | `@Feature(calls)` |
| POST | `/api/calls/:id/end` | `@Feature(calls)` |

### `core/client-errors.ts`

Дастрасӣ: ҷамъиятӣ

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| POST | `/api/client-errors` | `@Public` |

### `core/core.controllers.ts`

Дастрасӣ: 🔔 — ҳар корбар; аудит — шеф; ҷустуҷӯ — аз рӯи ҳуқуқ

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/alerts` | `@Feature(alerts)` |
| POST | `/api/alerts/read-all` | `@Feature(alerts)` |
| POST | `/api/alerts/:id/read` | `@Feature(alerts)` |
| GET | `/api/audit` | `@Roles(CHEF)` |
| GET | `/api/search` |  |

### `core/events.ts`

Дастрасӣ: ҳар корбар (SSE)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/events` | `@SkipThrottle` `@Feature(profile)` |

### `core/push.ts`

Дастрасӣ: ҳар корбар

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/push/key` | `@Feature(profile)` |
| POST | `/api/push/subscribe` | `@Feature(profile)` |
| POST | `/api/push/unsubscribe` | `@Feature(profile)` |

### `customers/customers.ts`

Дастрасӣ: шеф, менеҷер; `lookup` ва `POST` — ҳамчунин POS

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/customers` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/customers/stats` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/customers/lookup` | `@Roles(CHEF, MANAGER)` `@Feature(pos)` `@Roles(CHEF, MANAGER, STAFF)` |
| GET | `/api/customers/:id` | `@Roles(CHEF, MANAGER)` |
| POST | `/api/customers` | `@Roles(CHEF, MANAGER)` `@Feature(pos)` `@Roles(CHEF, MANAGER, STAFF)` |
| PATCH | `/api/customers/:id` | `@Roles(CHEF, MANAGER)` |
| DELETE | `/api/customers/:id` | `@Roles(CHEF, MANAGER)` `@Roles(CHEF)` |

### `debts/debt-requests.ts`

Дастрасӣ: шеф, менеҷер, кассир/фурӯшанда; тасдиқ — шеф, менеҷер (дар сервис)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/debt-requests` | `@Feature(debts)` |
| POST | `/api/debt-requests` | `@Feature(debts)` |
| POST | `/api/debt-requests/sale` | `@Feature(debts)` `@Feature(pos)` |
| POST | `/api/debt-requests/:id/decide` | `@Feature(debts)` |

### `debts/debts.ts`

Дастрасӣ: шеф (ҳама), менеҷер ва кассир/фурӯшанда (филиал); `add` — на кассир

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/debts/summary` | `@Feature(debts)` |
| GET | `/api/debts` | `@Feature(debts)` |
| GET | `/api/debts/:customerId` | `@Feature(debts)` |
| POST | `/api/debts/:customerId/pay` | `@Feature(debts)` |
| POST | `/api/debts/:customerId/add` | `@Feature(debts)` |
| POST | `/api/debts/:customerId/remind` | `@Feature(debts)` |

### `expenses/expenses.ts`

Дастрасӣ: шеф, менеҷер

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/expenses` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/expenses/export` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/expenses/pnl` | `@Roles(CHEF, MANAGER)` |
| POST | `/api/expenses` | `@Roles(CHEF, MANAGER)` |
| PATCH | `/api/expenses/:id` | `@Roles(CHEF, MANAGER)` |
| DELETE | `/api/expenses/:id` | `@Roles(CHEF, MANAGER)` |

### `health.controller.ts`

Дастрасӣ: ҷамъиятӣ

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/health` | `@SkipThrottle` `@Public` |

### `messages/messages.ts`

Дастрасӣ: ҳама (`messages`); корманд — танҳо бо менеҷер ва шеф

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/messages/contacts` | `@Feature(messages)` |
| GET | `/api/messages/contacts/:id` | `@Feature(messages)` |
| POST | `/api/messages/activity` | `@Feature(messages)` |
| GET | `/api/messages/unread` | `@Feature(messages)` |
| GET | `/api/messages/thread/:id` | `@Feature(messages)` |
| POST | `/api/messages` | `@Feature(messages)` |
| POST | `/api/messages/media` | `@Feature(messages)` |
| GET | `/api/messages/media/:id` | `@Feature(messages)` |

### `notifications/business-whatsapp.controller.ts`

Дастрасӣ: шеф (WhatsApp-и бизнес)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/auth/organization/whatsapp` | `@Feature(profile)` `@Roles(CHEF)` |
| PUT | `/api/auth/organization/whatsapp` | `@Feature(profile)` `@Roles(CHEF)` |
| POST | `/api/auth/organization/whatsapp/auto` | `@Feature(profile)` `@Roles(CHEF)` |
| DELETE | `/api/auth/organization/whatsapp` | `@Feature(profile)` `@Roles(CHEF)` |
| GET | `/api/auth/organization/whatsapp/qr` | `@Feature(profile)` `@Roles(CHEF)` |

### `notifications/channels.controller.ts`

Дастрасӣ: ҳар корбар (Telegram-и худ)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/auth/channels` | `@Feature(profile)` `@AllowPending` |
| DELETE | `/api/auth/channels/telegram` | `@Feature(profile)` `@AllowPending` |
| POST | `/api/auth/channels/test` | `@Feature(profile)` `@AllowPending` |

### `notifications/integrations.controller.ts`

Дастрасӣ: шеф

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/integrations/status` | `@Roles(CHEF)` |
| GET | `/api/integrations/whatsapp-qr` | `@Roles(CHEF)` `@SuperAdmin` |
| GET | `/api/integrations/logs` | `@Roles(CHEF)` |
| POST | `/api/integrations/test-report` | `@Roles(CHEF)` |
| POST | `/api/integrations/daily-report` | `@Roles(CHEF)` |

### `notifications/telegram-webhook.controller.ts`

Дастрасӣ: Telegram (сарлавҳаи махфӣ)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| POST | `/api/telegram/webhook` | `@SkipThrottle` `@Public` |

### `notifications/whatsapp-webhook.controller.ts`

Дастрасӣ: Meta (имзо) / Green-API (Bearer)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/whatsapp/webhook` | `@SkipThrottle` `@Public` |
| POST | `/api/whatsapp/webhook` | `@SkipThrottle` `@Public` |
| POST | `/api/whatsapp/webhook/greenapi` | `@SkipThrottle` `@Public` |
| POST | `/api/whatsapp/webhook/greenapi/:orgId` | `@SkipThrottle` `@Public` |

### `orders/orders.ts`

Дастрасӣ: фурӯшандагон (`canSell`)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/orders` | `@Feature(pos, sales)` |
| GET | `/api/orders/export` | `@Feature(pos, sales)` |
| POST | `/api/orders` | `@Feature(pos, sales)` |

### `products/products.ts`

Дастрасӣ: хондан — `products`/`pos`; тағйир — шеф; акс — ҷамъиятӣ

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/products` | `@Feature(products, pos)` |
| POST | `/api/products` | `@Feature(products, pos)` `@Roles(CHEF)` |
| PATCH | `/api/products/:id` | `@Feature(products, pos)` `@Roles(CHEF)` |
| DELETE | `/api/products/:id` | `@Feature(products, pos)` `@Roles(CHEF)` |
| PUT | `/api/products/:id/image` | `@Feature(products, pos)` `@Roles(CHEF)` |
| DELETE | `/api/products/:id/image` | `@Feature(products, pos)` `@Roles(CHEF)` |
| POST | `/api/products/:id/stock` | `@Feature(products, pos)` |
| GET | `/api/images/:id` | `@Public` |

### `promos/promos.ts`

Дастрасӣ: шеф; менеҷер — хондан; `check` — POS

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/promos` | `@Feature(customers)` `@Roles(CHEF, MANAGER)` |
| GET | `/api/promos/check` | `@Feature(pos)` |
| POST | `/api/promos` | `@Feature(customers)` `@Roles(CHEF)` |
| PATCH | `/api/promos/:id` | `@Feature(customers)` `@Roles(CHEF)` |
| DELETE | `/api/promos/:id` | `@Feature(customers)` `@Roles(CHEF)` |

### `shifts/shifts.ts`

Дастрасӣ: шеф, менеҷер; корманд — сменаҳои худ ва «Омадам / Рафтам» ([08](08-jadval-va-vazifaho.md))

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/shifts` | `@Feature(schedule)` |
| GET | `/api/shifts/today` | `@Feature(schedule)` `@Roles(CHEF, MANAGER)` |
| GET | `/api/shifts/mine` | `@Feature(schedule)` |
| POST | `/api/shifts` | `@Feature(schedule)` `@Roles(CHEF, MANAGER)` |
| POST | `/api/shifts/copy-week` | `@Feature(schedule)` `@Roles(CHEF, MANAGER)` |
| POST | `/api/shifts/check-in` | `@Feature(schedule)` |
| POST | `/api/shifts/check-out` | `@Feature(schedule)` |
| PATCH | `/api/shifts/:id` | `@Feature(schedule)` `@Roles(CHEF, MANAGER)` |
| DELETE | `/api/shifts/:id` | `@Feature(schedule)` `@Roles(CHEF, MANAGER)` |

### `shop/shop.ts`

Дастрасӣ: ҷамъиятӣ / мизоҷи онлайн / кормандони `online`

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/shop/stores` | `@Public` |
| GET | `/api/shop/stores/:id` | `@Public` |
| GET | `/api/shop/me` | `@ClientOnly` |
| GET | `/api/shop/debts` | `@ClientOnly` |
| PATCH | `/api/shop/me` | `@ClientOnly` |
| GET | `/api/shop/orders` | `@ClientOnly` |
| GET | `/api/shop/telegram-bot` | `@Public` |
| GET | `/api/shop/stores/:id/promo` | `@Public` |
| POST | `/api/shop/stores/:id/view` | `@Public` |
| POST | `/api/shop/table-orders` | `@Public` |
| POST | `/api/shop/orders` | `@ClientOnly` |
| POST | `/api/shop/orders/:id/review` | `@ClientOnly` |
| POST | `/api/shop/orders/:id/cancel` | `@ClientOnly` |
| GET | `/api/online-orders/visits` | `@Feature(online)` `@Roles(CHEF, MANAGER)` |
| GET | `/api/online-orders` | `@Feature(online)` |
| PATCH | `/api/online-orders/:id` | `@Feature(online)` |

### `stats/stats.controller.ts`

Дастрасӣ: шеф, менеҷер; `branches` — шеф

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/stats/overview` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/stats/timeseries` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/stats/branches` | `@Roles(CHEF, MANAGER)` `@Roles(CHEF)` |
| GET | `/api/stats/products` | `@Roles(CHEF, MANAGER)` |

### `tasks/tasks.ts`

Дастрасӣ: шеф, менеҷер; корманд — вазифаҳои худ (хондан ва ҳолат)

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/tasks` | `@Feature(tasks)` |
| POST | `/api/tasks` | `@Feature(tasks)` `@Roles(CHEF, MANAGER)` |
| PATCH | `/api/tasks/:id` | `@Feature(tasks)` |
| DELETE | `/api/tasks/:id` | `@Feature(tasks)` `@Roles(CHEF, MANAGER)` |

### `users/users.controller.ts`

Дастрасӣ: шеф, менеҷер

| Метод | Роҳ | Декораторҳо |
|---|---|---|
| GET | `/api/users` | `@Roles(CHEF, MANAGER)` |
| GET | `/api/users/:id` | `@Roles(CHEF, MANAGER)` |
| POST | `/api/users` | `@Roles(CHEF, MANAGER)` |
| PATCH | `/api/users/:id` | `@Roles(CHEF, MANAGER)` |
| DELETE | `/api/users/:id` | `@Roles(CHEF, MANAGER)` |
