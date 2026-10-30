# 00 — Лоиҳа дар як нигоҳ

## Чист FilialHub

**FilialHub** — платформаи SaaS (CRM + POS) барои бизнесҳое, ки якчанд филиал доранд: тарабхона, мағозаи хӯрокворӣ,
либос, техника, дорухона, сантехника, маводи сохтмонӣ ва ғ. Ҳар бизнес дар сайт сабти ном мешавад, супер-админ онро
тасдиқ мекунад, ва соҳиб (шеф) филиалҳо, кормандон, фурӯш, анбор, мизоҷон, қарз, хароҷот ва ҷадвалро дар як ҷо идора мекунад.
Мизоҷони бизнес аз **бозори онлайн** фармоиш медиҳанд ё дар тарабхона бо **QR-и миз** фармоиш мекунанд.

Забони асосӣ — тоҷикӣ; ҳамчунин русӣ ва англисӣ. Пул — сомонӣ, минтақаи вақт — `Asia/Dushanbe` (UTC+5).

## Кӣ истифода мебарад

| Корбар | Мақсад |
|---|---|
| 🛡️ Супер-админ | Бизнесҳои навро тасдиқ, рад ё баст мекунад |
| 👑 Шеф (соҳиб) | Тамоми бизнес: ҳамаи филиалҳо, омор, қарзҳо, танзимот |
| 🧑‍💼 Менеҷер | Як филиал: кормандон, ҷадвал, вазифаҳо, тасдиқи қарз |
| 💵 Кассир / 🛍️ Фурӯшанда | Фурӯш (POS), фармоишҳои онлайн, қабули пардохти қарз |
| 🍽️ Официант, 📦 Анбордор | Рӯйхати мол ва нарх |
| 👨‍🍳 Ошпаз, 🧹 Фаррош | Профил, маош, смена |
| 🛒 Мизоҷи онлайн (`Client`) | Бозор, сабад, фармоишҳо, қарзи худ |

## Технологияҳо

| Қабат | Технология | Версия |
|---|---|---|
| Сайт | Next.js (App Router, Cache Components, Turbopack) | 16.4 |
| UI | React, Tailwind CSS, lucide-react, Recharts | 19.3 / 4 / 1.x / 3.x |
| API | NestJS (Express) | 11 |
| База | PostgreSQL + Prisma ORM (`@prisma/adapter-pg`) | Prisma 7 |
| Воридшавӣ | JWT (`@nestjs/jwt`, 12 соат), bcryptjs | — |
| Вақти воқеӣ | Server-Sent Events (`/api/events`) | — |
| Занг | WebRTC (браузер ↔ браузер), STUN-и Google/Cloudflare | — |
| Push | Web Push (`web-push`, калидҳои VAPID) | — |
| Ҳудуди дархостҳо | `@nestjs/throttler` | 6 |
| Тест | `node:test` + `tsx` | — |
| Deploy | Render (Blueprint `render.yaml`), GitHub Actions | — |
| Node | ≥ 20.19 (дар Render — 22) | — |

> ⚠️ `AGENTS.md`: ин Next.js аз версияҳои кӯҳна фарқ дорад. Пеш аз навиштани код ҳуҷҷатро дар `node_modules/next/dist/docs/` хонед.

## Сохтори папкаҳо (monorepo, npm workspaces)

```
exem-e-4.next/
├── apps/
│   ├── api/                      # NestJS API (порт 4100)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # ҳамаи моделҳо (≈30 модел)
│   │   │   ├── migrations/       # миграцияҳо (ҳар тағйири база — миграцияи нав)
│   │   │   └── seed.ts           # маълумоти намунавӣ (ҳисобҳои демо)
│   │   └── src/
│   │       ├── main.ts           # оғоз: префикси /api, gzip, CORS, ValidationPipe
│   │       ├── app.module.ts     # ҳамаи модулҳо + guard-ҳои глобалӣ
│   │       ├── env.ts            # .env + санҷиши JWT_SECRET дар production
│   │       ├── auth/             # воридшавӣ, guard-ҳо, декораторҳо
│   │       ├── common/           # access.ts (scopeBranch), xlsx, вақт
│   │       ├── core/             # 🔔, аудит, SSE, push, throttle, ҷустуҷӯ
│   │       ├── admin/ branches/ users/ products/ orders/ customers/
│   │       ├── debts/ promos/ expenses/ shifts/ tasks/ stats/
│   │       ├── messages/ calls/ notifications/ shop/
│   │       └── generated/prisma/ # клиенти Prisma (худкор, даст назанед)
│   └── web/                      # Next.js сайт (порт 3100)
│       ├── app/
│       │   ├── (app)/            # панели корӣ (баъди воридшавӣ)
│       │   ├── shop/ ru/shop/    # бозори онлайн (+ саҳифаҳои русӣ барои Google)
│       │   ├── login/ register/  # воридшавӣ ва сабти бизнес
│       │   └── page.tsx          # саҳифаи асосӣ (лендинг)
│       ├── components/           # UI ва модулҳои калон (shell, calls, charts…)
│       ├── lib/                  # api, auth, events (SSE), i18n, офлайн-POS, push
│       └── public/sw.js          # Service Worker (push, PWA)
├── packages/shared/src/index.ts  # навъҳо, номҳо ва қоидаҳои дастрасӣ — барои web ва api якхела
├── docs/                         # ҳуҷҷатҳо (ҳамин папка)
├── .github/workflows/            # нусхаи база ҳар шаб, бедор нигоҳ доштани Render
└── render.yaml                   # Deploy: PostgreSQL + api + web
```

**Чаро `packages/shared`:** номҳо (`ROLE_LABELS`), навъҳо (`Order`, `Customer`…) ва қоидаи асосии дастрасӣ `canAccess()`
дар як ҷо навишта шудаанд. Сайт менюро бо он месозад ва API бо ҳамон қоида роҳҳоро мебандад, бинобар ин онҳо ҳеҷ гоҳ аз ҳам фарқ намекунанд.
Пас аз тағйир: `npm run build -w @filialhub/shared`.

## Чӣ тавр кор мекунад (як дархост)

```
Браузер ──/api/*──▶ Next.js (rewrite) ──▶ NestJS
                                        ├─ AppThrottlerGuard   (ҳудуди дархостҳо)
                                        ├─ JwtAuthGuard        (токен + корбари фаъол аз база)
                                        ├─ RolesGuard          (@Roles)
                                        ├─ StaffAccessGuard    (@Feature — вазифаи корманд)
                                        └─ Service ── scopeBranch / organizationId ──▶ PostgreSQL
Браузер ◀── /api/events (SSE) ── «паёми нав», «занг», «🔔», «менависад…»
```

Сайт ба API бевосита намеравад: Next `/api/:path*`-ро ба `API_URL` мегузаронад (`apps/web/next.config.ts`), бинобар ин CORS лозим нест.

## Оғоз дар компютер

```bash
npm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
npm run db:setup
```

```bash
npm run dev
```

Сайт: http://localhost:3100 · API: http://localhost:4100/api · Ҳисобҳои демо — [15-sanjish.md](15-sanjish.md).

| Скрипт | Чӣ мекунад |
|---|---|
| `npm run dev` | shared + prisma generate, баъд API ва сайт якҷоя |
| `npm run build` | shared → api → web |
| `npm test` | тестҳои API (`apps/api/src/**/*.spec.ts`) |
| `npm run db:seed` | маълумоти намунавӣ |
| `npm run lint -w @filialhub/web` | ESLint |
