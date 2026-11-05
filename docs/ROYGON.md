# Хизматҳои ройгон — қадам ба қадам

Ин корҳоро танҳо соҳиби ҳисобҳо (Render, GitHub, Google) карда метавонад — код аллакай тайёр аст.
Тартиб аз рӯи муҳимӣ.

## 1. База ба Neon (аз ҳама муҳим)

Базаи Render Free пас аз 30 рӯз **нест мешавад**. Neon (нақшаи Free, 0,5 ГБ) мӯҳлат надорад.

1. neon.tech → Sign up (бо GitHub) → **Create project** → минтақа: Frankfurt (наздик ба Render).
2. Neon → Dashboard → **Connect** → **Connection pooling**-ро хомӯш кунед → суроғаро нусха гиред
   (суроғаи pooled барои `prisma migrate` мувофиқ нест — миграцияҳо ҳангоми deploy мемонанд).
3. Маълумотро гузаронед: Neon → **Import data** → «External URL»-и базаи Render-ро гузоред
   (Render → filialhub-db → Connections → External Database URL).
4. Render → filialhub-web → **Environment** → `DATABASE_URL` = суроғаи Neon → **Save** (сервис худаш аз нав сар мешавад).
5. Санҷиш: `<сайт>/api/health` → `{"ok":true}`, бо `chef@…` ворид шавед ва фурӯшро бинед.
6. Дар GitHub → Settings → Secrets → `DATABASE_URL`-ро ҳам ба Neon иваз кунед (нусхаи шабонаи `db-backup.yml`).

Тафсилот: [specs/14-infra-va-bekhatari.md](specs/14-infra-va-bekhatari.md).

## 2. UptimeRobot — хабар, вақте ки сайт кор намекунад

1. uptimerobot.com → Sign up (Free: 50 монитор, ҳар 5 дақиқа).
2. **Add New Monitor** → HTTP(s) → URL: `<сайт>/api/health` → Interval: 5 min.
3. **My Settings → Alert Contacts → Add → Telegram** → ботро дар Telegram кушоед → тасдиқ.
4. Дар монитор ин контактро интихоб кунед. Ҳоло агар сайт ё база афтад — дар Telegram хабар меояд.

## 3. Google Search Console — Google мағозаҳоро зудтар меёбад

1. search.google.com/search-console → **Add property** → «URL prefix» → суроғаи сайт.
2. Тарзи тасдиқ: **HTML tag** → аз `<meta name="google-site-verification" content="ABC…">` танҳо `ABC…`-ро нусха гиред.
3. Render → filialhub-web → Environment → `GOOGLE_SITE_VERIFICATION` = `ABC…` → Save → **Manual Deploy**
   (қимат ҳангоми build навишта мешавад).
4. Дар Search Console **Verify** пахш кунед.
5. **Sitemaps** → `sitemap.xml` → Submit. Пас аз 2–7 рӯз саҳифаҳо дар Google пайдо мешаванд.
6. Яндекс Вебмастер (барои ҷустуҷӯи русӣ) ҳамин тавр: `YANDEX_VERIFICATION`.

## 4. Домени худ (ягона чизи пулакӣ, ~10–20 $ дар сол)

1. Доменро харед (масалан `filialhub.tj` ё `.com`).
2. Render → filialhub-web → Settings → **Custom Domains** → Add → `filialhub.tj` ва `www.filialhub.tj`.
3. Дар идораи домен (DNS) сабтҳоеро, ки Render нишон медиҳад, гузоред (CNAME / A). HTTPS худкор ва ройгон аст.
4. Render → Environment → `SITE_URL` = `https://filialhub.tj` → Save → Manual Deploy
   (canonical, sitemap ва расмҳои Telegram/WhatsApp ба домени нав мегузаранд).
5. Дар Search Console домени навро ҳамчун property илова кунед ва sitemap-ро аз нав фиристед.

## 5. Ҳар тағйир — бо PR ва CI

1. Тағйир дар шохаи нав (на дар `main`) → **Pull Request**.
2. GitHub Actions (`ci.yml`) тестҳо, TypeScript, ESLint ва build-ро месанҷад — ✅ сабз бояд бошад.
3. Танҳо баъд **Merge** → Render худкор deploy мекунад.
4. GitHub → Settings → Branches → **Branch protection** барои `main`: «Require status checks» → `check`.
   Акнун коди вайрон ба сайт намерасад.

## 6. Telegram — барои «Паролро фаромӯш кардам» ва ҳисоботҳо

1. @BotFather → `/newbot` → токен → Render → `TELEGRAM_BOT_TOKEN`.
2. Ҳар корманд: Профил → «WhatsApp ва Telegram» → «Пайваст кардан».
3. Акнун дар `/forgot` код ба Telegram меояд. Бе Telegram ва WhatsApp паролро менеҷер ё шеф дар «Кормандон» иваз мекунад.
