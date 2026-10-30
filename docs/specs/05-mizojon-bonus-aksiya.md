# 05 — Мизоҷон (CRM), бонус ва аксияҳо

## Мизоҷон (`Customer`)

Мизоҷи мағоза (на мизоҷи онлайн). Вай дар ширкат аз рӯи рақами телефон ягона аст: `@@unique([organizationId, phone])`.
Рақам ба шакли ягона оварда мешавад: «90 123 45 67» → «+992901234567».

| Майдон | Маъно |
|---|---|
| `points` | бонус (1 балл = 1 сомонӣ). Дар **ҳамаи филиалҳо** кор мекунад |
| `totalSpent`, `visits`, `lastVisitAt` | омор барои сегментҳо |
| `debt`, `debtRemindedAt` | қарз ([06](06-daftari-qarz.md)) |
| `telegramChatId` | агар мизоҷ ба боти мизоҷон рақамашро фиристода бошад |
| `branchId` | филиале, ки мизоҷ дар он сабт шудааст |

- **Сегментҳо:** `VIP`, `REGULAR` (доимӣ), `NEW`, `SLEEPING` (хоб рафта), аз рӯи харид ва вақти охирин омадан.
- Кассир дар POS мизоҷро аз рӯи рақам меёбад ва сабт мекунад (`GET /customers/lookup`, `POST /customers`, `@Feature('pos')`).
- Рӯйхат, омор ва таҳрир танҳо барои шеф ва менеҷер аст (менеҷер — мизоҷони филиали худ).

| Роҳ | Кӣ |
|---|---|
| `GET /api/customers`, `/stats`, `/:id`, `PATCH /:id` | шеф, менеҷер |
| `GET /api/customers/lookup`, `POST /api/customers` | ҳамчунин кассир/фурӯшанда (POS) |
| `DELETE /api/customers/:id` | шеф |

## Кодҳои тахфиф (`PromoCode`)

- Фоиз **ё** маблағ (яке аз ду), `minTotal`, `maxUses`, мӯҳлат (`startsAt`/`endsAt`), рӯзҳои ҳафта, канал: `pos` ва/ё `online`.
- Санҷиш: `GET /api/promos/check` (POS). Истифода дар транзаксияи фурӯш бо `updateMany … uses < maxUses` анҷом меёбад, бинобар ин ду касса якбора охирин кодро истифода карда наметавонанд.
- Шеф месозад, менеҷер мебинад. Саҳифа: `/promos`.

## Файлҳо

`apps/api/src/customers/customers.ts`, `promos/promos.ts`, `apps/web/app/(app)/customers`, `promos`, `components/crm.tsx`, `crm-widgets.tsx`.
