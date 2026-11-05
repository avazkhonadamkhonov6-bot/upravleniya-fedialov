# Сервер, база ва суръат — ҳама ройгон

Ин файл ҳама чизро дар бораи ҷои кори сайт ҷамъ мекунад: ҳоло дар куҷост, чӣ тавр бе пул зудтар кардан, гузариш ба Neon ва Oracle Cloud,
ва ҳалли мушкилот. Қоида: **танҳо хидматҳои ройгон** — агар чизе пул талабад, онро намекунем.

Тафсилоти техникӣ (тағйирёбандаҳо, амният): [specs/14-infra-va-bekhatari.md](specs/14-infra-va-bekhatari.md).
Дигар хидматҳои ройгон (UptimeRobot, Google): [ROYGON.md](ROYGON.md).

## Ҳолати ҳозира (5.11.2026)

| | Ҳоло | Беҳтарин ройгон |
|---|---|---|
| Сайт + API | Render Free, як сервис (`filialhub-web`), Frankfurt | Oracle Cloud Always Free |
| База | Render Free PostgreSQL — **пас аз 30 рӯз нест мешавад** | Neon Free, Frankfurt |
| Протсессор / хотира | 0,1 CPU / 512 МБ | 4 CPU / 24 ГБ |
| Пас аз deploy | 1–2 дақиқа дастрас нест | чанд сония |
| Хоб / ҳадди соатҳо | 750 соат, keep-awake лозим | надорад |
| HTTPS | Render (Cloudflare) | Caddy + sslip.io, худкор |

Суръати сайти зинда (аз Душанбе, 5.11.2026): саҳифаи асосӣ ~0,4 с, `/api/health` ~0,2 с, мағоза 0,2–1 с.
Brotli ва Cloudflare (нуқтаи Душанбе) фаъоланд.

## Чаро сайт аллакай зуд аст (дар код)

- Кеши ҷавобҳо дар браузер (`lib/use-api.ts`): саҳифаи пештар кушодашуда фавран нишон дода мешавад.
- gzip/Brotli, service worker (`public/sw.js`) — файлҳои JS/CSS аз кеш, POS бе интернет.
- Графикҳо (`charts-lazy`) ва луғати тарҷума (`i18n-dict`) дер бор мешаванд — саҳифаи аввал сабук аст.
- 46 индекс дар база, аксҳо бо `Cache-Control: immutable`.
- Мағоза дар сервер бо `"use cache"` сохта мешавад (`lib/shop-data.ts`).
- **Гарм нигоҳ доштани мағоза** (`warmShopPages` дар `apps/api/src/main.ts`): пас аз deploy ё 1 соати бекорӣ кеши Next.js холӣ буд
  ва мизоҷи аввал дар Render то **5 сония** интизор мешуд. Акнун API пас аз оғоз ва ҳар 10 дақиқа `/shop` ва ҳар мағозаро аз `sitemap.xml`
  як бор мекушояд. Хомӯш: `WARM_SHOP=false`.

Хулоса: дар код ҷои калони суст намонд (аз 280 дархост танҳо содироти Excel-и фурӯш 1,4 с — барои файл муқаррарӣ).
Маҳдудияти асосӣ — 0,1 CPU-и Render. Ҷаҳиши калон — гузариш ба Oracle.

---

## Қадами 1. База ба Neon (≈15 дақиқа) — аз ҳама муҳим

Базаи ройгони Render пас аз 30 рӯз **нест мешавад** ва ҳамаи маълумот гум мешавад. Neon мӯҳлат надорад.

1. Ба **neon.tech** ворид шавед (бо GitHub ё Google) → **New project**:
   - Postgres version: **17**
   - Region: **AWS Europe Central 1 (Frankfurt)**
2. **Connect** → тугмаи **Connection pooling**-ро **хомӯш** кунед → суроғаро нусха кунед.
   Он бо `postgresql://` сар шуда, бо `?sslmode=require` тамом мешавад.
   (Суроғаи pooled барои `prisma migrate` мувофиқ нест — миграцияҳо ҳангоми deploy мемонанд.)
3. Маълумотро гузаронед: Neon → **Import data** → **External URL**:
   Render → `filialhub-db` → **Connections** → **External Database URL**-ро гузоред → Import.
4. Render → `filialhub-web` → **Environment** → `DATABASE_URL`-ро ба суроғаи Neon иваз кунед → **Save, rebuild and deploy**.
5. Санҷед: сайтро кушоед, ворид шавед, фурӯшҳо ва молҳо ҳастанд?
6. GitHub → Settings → Secrets → `DATABASE_URL`-ро ҳам ба суроғаи Neon иваз кунед (нусхаи шабонаи `db-backup.yml` аз ҳамин база).
7. Танҳо пас аз ҳамаи инҳо: Render → `filialhub-db` → Settings → **Delete database**.

> Neon-и ройгон: 0,5 ГБ ва ~100 соат кори протсессор дар моҳ. База вақте касе сайтро истифода намебарад
> худаш мехобад (`/api/health` ба база намеравад), пас барои як бизнес кифоя аст.
> Neon → **Usage**-ро моҳе як бор бинед. Агар ба ҳад наздик шавад, Supabase (ройгон, бе ҳадди соат) низ ҳамин тавр кор мекунад.
> Агар база ба 0,5 ГБ наздик шавад — аксҳо ва медиаи чатро ба Cloudflare R2 (10 ГБ ройгон) гузаронед.

---

## Қадами 2. Сервер дар Oracle Cloud (≈40 дақиқа)

Файлҳо дар `deploy/oracle/`: `Dockerfile` (сайт + API дар як контейнер, мисли Render), `docker-compose.yml` (+ Caddy барои HTTPS),
`Caddyfile`, `.env.example`, `setup.sh` (насби якдафъаина), `update.sh` (нав кардан). Render ба инҳо вобаста нест.

1. **oracle.com/cloud/free** → **Start for free**. Home region: **Germany Central (Frankfurt)**.
   Корт танҳо барои тасдиқ аст; дар ҳисоби **Always Free** пул гирифта намешавад. Ба **Upgrade to Pay As You Go** розӣ нашавед.
2. **Compute → Instances → Create instance**:
   - Image: **Canonical Ubuntu 24.04**
   - Shape: **Ampere → VM.Standard.A1.Flex**, **4 OCPU, 24 GB** (нишони «Always Free eligible»)
   - Networking: **Assign a public IPv4 address** — Yes
   - SSH keys: **Save private key** (файли `.key`-ро нигоҳ доред — бе он ба сервер даромадан мумкин нест)
   - Агар «Out of capacity» гуфт — пас аз чанд соат боз кӯшиш кунед (дар Frankfurt маъмул аст).
3. Портҳоро кушоед: Instance → **Subnet** → **Security List** → **Add Ingress Rules**:
   Source `0.0.0.0/0`, TCP, порт **80,443**. Боз як қоида: UDP, порт **443**.
4. Ба сервер дароед (Windows PowerShell):
   ```
   ssh -i C:\роҳ\ба\ssh-key.key ubuntu@<IP-и сервер>
   ```
5. Дар сервер:
   ```
   curl -fsSL https://raw.githubusercontent.com/avazkhonadamkhonov6-bot/upravleniya-fedialov/main/deploy/oracle/setup.sh | bash
   ```
6. Скрипт мегӯяд, ки `.env`-ро пур кунед:
   ```
   nano ~/filialhub/deploy/oracle/.env
   ```
   `DATABASE_URL` — суроғаи Neon аз қадами 1. Дигар калидҳо (Telegram, Green-API, супер-админ, AI, Google/Яндекс) — аз Render → Environment нусха кунед.
   `DOMAIN` ва `JWT_SECRET` худкор пур шудаанд. Сабт: `Ctrl+O`, `Enter`, `Ctrl+X`.
   > Агар `JWT_SECRET`-и Render-ро гузоред, корбарон аз аккаунт намебароянд.
7. Ба кор андохтан (бори аввал ~10 дақиқа):
   ```
   sg docker -c ~/filialhub/deploy/oracle/update.sh
   ```
   Дар охир суроға нишон дода мешавад, масалан `https://141-147-1-2.sslip.io` (HTTPS ройгон ва худкор, домен харидан лозим нест).

> Docker-image дар компютери Windows санҷида нашудааст (Docker нест). Агар `update.sh` хато диҳад —
> `docker compose logs --tail 100 app`-ро бинед ва матни хаторо нусха кунед.

---

## Қадами 3. Гузариш

1. Сайти навро санҷед: воридшавӣ, POS, фурӯш, чат, мағоза.
2. Render → `filialhub-web` → Settings → **Suspend Web Service**.
   **Ҳатман**: агар ҳарду кор кунанд, ҳисоботи рӯзона ва ёдраскуниҳо ду бор мераванд ва боти Telegram байни онҳо мепарад.
   Нест накунед — агар чизе шавад, **Resume** мекунед.
3. Боти Telegram ва Green-API webhook-ро худкор ба суроғаи нав мегузоранд (`TELEGRAM_WEBHOOK_URL`, `GREENAPI_WEBHOOK_BASE` дар `docker-compose.yml`).
4. GitHub → Settings → Variables → `SITE_URL`-ро нест кунед (keep-awake дигар лозим нест).

### Deploy-и худкор (ихтиёрӣ)

GitHub → Settings → Secrets and variables → Actions:
- Variables → `ORACLE_HOST` = IP-и сервер
- Secrets → `ORACLE_SSH_KEY` = тамоми матни файли `.key`

Баъд аз ин ҳар push ба `main`, агар CI сабз бошад, сайтро дар сервер нав мекунад (`.github/workflows/deploy-oracle.yml`).
То инҳо гузошта нашаванд, workflow ҳеҷ кор намекунад (сабз мегузарад).

### Фармонҳои муфид (дар сервер)

```
cd ~/filialhub/deploy/oracle
docker compose logs --tail 100 app     # лог
docker compose restart app             # аз нав сар кардан
./update.sh                            # нав кардан бо дасти худ
```

---

## Ҳалли мушкилот

| Мушкилот | Ҳал |
|---|---|
| `npm run build` дар компютер бо хатои `next/font/google` ё TypeScript дар `.next/types` (саҳифаҳое, ки нестанд) | Кеши кӯҳнаи шохаи дигар. `rm -rf apps/web/.next` ва аз нав build |
| Мағоза дар `next start`-и локалӣ «Чизе нодуруст шуд» | `API_URL`-и сервер ба порти API мувофиқ нест (`.claude/launch.json`: `web-prod` → 4199). API-ро дар ҳамон порт сар кунед |
| Дар браузер гузаришҳо иҷро намешаванд ҳангоми санҷиш | Таб/равзана пинҳон аст — браузер кашиданро қатъ мекунад. Табро ба пеш биёред |
| Корманд дар экрани боркунӣ мемонад, вақте саҳифаи бастаро мекушояд | Ислоҳ шуд (5.11.2026, `components/shell.tsx`): пас аз 1 сония худкор ба саҳифаи худаш меравад |
| Сайт пас аз deploy 1–2 дақиқа кушода намешавад | Render Free чунин аст. Oracle (қадами 2) инро ҳал мекунад |
| Мағоза бори аввал суст | `WARM_SHOP` хомӯш нест? Пас аз оғоз 1 дақиқа интизор шавед — саҳифаҳо гарм мешаванд |

## Чизҳое, ки танҳо соҳиби аккаунт карда метавонад

| Кор | Ҳолат |
|---|---|
| Neon (қадами 1) | ☐ |
| Oracle Cloud (қадами 2–3) | ☐ |
| UptimeRobot — хабар ба Telegram, вақте сайт афтад ([ROYGON.md](ROYGON.md) §2) | ☐ |
| Google Search Console ([ROYGON.md](ROYGON.md) §3) | ☐ |
