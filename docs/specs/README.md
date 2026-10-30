# FilialHub — Мушаххасоти модулҳо (specs)

Ин папка барои касест, ки бори аввал ба код медарояд: **сайт чӣ дорад, бо чӣ сохта шудааст, ҳар қисм барои чӣ аст ва дар кадом файл аст.**
Ҳар файл як модулро пурра шарҳ медиҳад: мақсад, кӣ чӣ мебинад, қоидаҳо, модели маълумот, API, саҳифаҳо, файлҳо ва санҷиш.

> Ҳуҷҷатҳои умумӣ дар `docs/` мемонанд: [TZ.md](../TZ.md) (топшириқ), [PLAN.md](../PLAN.md) (архитектура ва таърих),
> [ROADMAP.md](../ROADMAP.md) (марҳилаҳо), [SPECS.md](../SPECS.md) (хулосаи кӯтоҳ), [DESIGN.md](../DESIGN.md) (дизайн).

## Мундариҷа

| # | Файл | Дар бораи чӣ |
|---|---|---|
| 00 | [00-umumi.md](00-umumi.md) | Лоиҳа дар як нигоҳ, технологияҳо, сохтори папкаҳо, чӣ тавр сар кардан |
| 01 | [01-auth-va-naqshho.md](01-auth-va-naqshho.md) | Воридшавӣ, нақшҳо, ҷудоии ширкатҳо, супер-админ, ҳимояи API |
| 02 | [02-filialho-va-kormandon.md](02-filialho-va-kormandon.md) | Филиалҳо, кормандон, вазифаҳо, маош |
| 03 | [03-furush-pos.md](03-furush-pos.md) | Фурӯши нав (POS), чек, POS-и офлайн, таърихи фурӯш |
| 04 | [04-mahsulot-va-anbor.md](04-mahsulot-va-anbor.md) | Маҳсулот, нархҳо, акс, анбори ҳар филиал |
| 05 | [05-mizojon-bonus-aksiya.md](05-mizojon-bonus-aksiya.md) | Мизоҷон (CRM), бонус, сегментҳо, кодҳои тахфиф |
| 06 | [06-daftari-qarz.md](06-daftari-qarz.md) | Дафтари қарз, дархост ва тасдиқи менеҷер, ёдрасҳо |
| 07 | [07-omor-va-harojot.md](07-omor-va-harojot.md) | Панели асосӣ, омор, хароҷот, фоидаи соф, Excel |
| 08 | [08-jadval-va-vazifaho.md](08-jadval-va-vazifaho.md) | Ҷадвали сменаҳо, давомот, вазифаҳо |
| 09 | [09-chat-va-zang.md](09-chat-va-zang.md) | Чат, овоз ва видео, «дар шабака / менависад», зангҳои WebRTC |
| 10 | [10-ogohinomaho-va-integratsiyaho.md](10-ogohinomaho-va-integratsiyaho.md) | 🔔, Web Push, Telegram, WhatsApp, ҳисоботи рӯзона |
| 11 | [11-bozori-onlayn.md](11-bozori-onlayn.md) | Бозори онлайн, мизоҷони онлайн, фармоиш аз миз (QR), баҳо, SEO |
| 12 | [12-frontend-dizayn.md](12-frontend-dizayn.md) | Next.js, сохтори саҳифаҳо, компонентҳо, забонҳо, PWA, дизайн |
| 13 | [13-api-kontrakt.md](13-api-kontrakt.md) | Ҳамаи 141 роҳи API, хатоҳо, рӯйдодҳои SSE |
| 14 | [14-infra-va-bekhatari.md](14-infra-va-bekhatari.md) | Render, тағйирёбандаҳо, нусхаи база, ҳудуди дархостҳо, амният |
| 15 | [15-sanjish.md](15-sanjish.md) | Тестҳо, санҷиши дастӣ, ҳисобҳои демо |

## Қоидаи навсозӣ

Агар модулро тағйир диҳед, файли ҳамон модулро ҳам дар ҳамон commit нав кунед. Рӯйхати API дар `13-api-kontrakt.md`
аз контроллерҳо ҷамъ шудааст. Пас аз илова кардани роҳи нав онро ҳам ба он ҷо илова кунед.
