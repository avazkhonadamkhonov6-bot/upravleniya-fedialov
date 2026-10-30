# 07 — Панели асосӣ, омор ва хароҷот

## Панели асосӣ (`/dashboard`)

Барои шеф ва менеҷер: фурӯш ва фоида **имрӯз / дирӯз / ин ҳафта / ин моҳ** бо тағйир (▲▼ %), график, беҳтарин маҳсулот,
муқоисаи филиалҳо (танҳо шеф), давомоти имрӯз ва вазифаҳои фаврӣ. Менеҷер танҳо филиали худро мебинад.

| Роҳ | Кӣ | Чӣ |
|---|---|---|
| `GET /api/stats/overview` | шеф, менеҷер | рақамҳои асосӣ |
| `GET /api/stats/timeseries` | шеф, менеҷер | график рӯз ба рӯз |
| `GET /api/stats/branches` | шеф | муқоисаи филиалҳо |
| `GET /api/stats/products` | шеф, менеҷер | беҳтарин молҳо |

Ҳисоб бо SQL-и хом ва индексҳо (`Order(branchId, createdAt)`), ва рӯзҳо бо вақти Душанбе (`common/time.ts`, `TIMEZONE`).

## Хароҷот ва фоидаи соф (`/expenses`)

- Категорияҳо: иҷора, маош, коммуналӣ, маҳсулот ва лавозимот, реклама, дигар (`ExpenseCategory`).
- **Фоидаи соф = фурӯш − арзиши аслӣ − хароҷот**, моҳ ба моҳ (`GET /api/expenses/pnl`).
- Менеҷер хароҷоти филиали худро сабт мекунад, шеф ҳамаро.
- Excel: `GET /api/expenses/export`.

| Роҳ | Кӣ |
|---|---|
| `GET /api/expenses`, `/export`, `/pnl`, `POST`, `PATCH /:id`, `DELETE /:id` | шеф, менеҷер (филиал) |

## Ҳисоботи рӯзона

Ҳар рӯз соати 22:00 (`DAILY_REPORT_CRON`) ба шеф (ҳамаи филиалҳо) ва менеҷерон (филиали худ) дар Telegram/WhatsApp ҳисобот меравад:
фурӯш, фоида, шумораи чекҳо ва беҳтарин мол (`notifications/report.service.ts`). Ботро ҳамчунин бо фармонҳо пурсидан мумкин аст: «имрӯз», «ҳафта», «моҳ».

## Ҷустуҷӯи умумӣ (Ctrl+K)

`GET /api/search?q=` кормандон, мизоҷон, филиалҳо ва молҳоро аз рӯи ҳуқуқи корбар меёбад (`core/core.controllers.ts`, `components/command-palette.tsx`).

## Файлҳо

`apps/api/src/stats/*`, `expenses/expenses.ts`, `notifications/report.service.ts`, `common/time.ts`, `common/xlsx.ts`,
`apps/web/app/(app)/dashboard`, `expenses`, `components/charts.tsx`, `charts-lazy.tsx`, `stats-panel.tsx`, `export-button.tsx`.

## Тестҳо

`common/xlsx.spec.ts` (zip-и дуруст, рақам/матн, ҳарфҳои тоҷикӣ, сутунҳо пас аз Z).
