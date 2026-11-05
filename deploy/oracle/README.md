# Гузариш ба серверҳои ройгони доимӣ: Neon + Oracle Cloud

Ҳама ройгон аст ва пул гирифта намешавад. Тартиб муҳим аст: **аввал Neon** (маълумотро нигоҳ медорад), **баъд Oracle** (суръат).
То қадами 3 сайти Render бе тағйир кор мекунад.

| | Render Free (ҳоло) | Oracle Always Free |
|---|---|---|
| Протсессор / хотира | 0,1 CPU / 512 МБ | 4 CPU / 24 ГБ |
| Пас аз deploy | 1–2 дақиқа дастрас нест | чанд сония |
| Хоб / ҳадди соатҳо | 750 соат, keep-awake лозим | надорад |

---

## Қадами 1. База ба Neon (≈15 дақиқа)

Базаи ройгони Render пас аз 30 рӯз **нест мешавад**. Neon мӯҳлат надорад.

1. Ба **neon.tech** ворид шавед (бо GitHub ё Google) → **New project**:
   - Postgres version: **17**
   - Region: **AWS Europe Central 1 (Frankfurt)**
2. **Connect** → тугмаи **Connection pooling**-ро **хомӯш** кунед → суроғаро нусха кунед.
   Он бо `postgresql://` сар шуда, бо `?sslmode=require` тамом мешавад.
3. Маълумотро гузаронед: Neon → **Import data** → **External URL**:
   Render → `filialhub-db` → **Connections** → **External Database URL**-ро гузоред → Import.
4. Render → `filialhub-web` → **Environment** → `DATABASE_URL`-ро ба суроғаи Neon иваз кунед → **Save, rebuild and deploy**.
5. Санҷед: сайтро кушоед, ворид шавед, фурӯшҳо ва молҳо ҳастанд?
6. GitHub → Settings → Secrets → `DATABASE_URL`-ро ҳам ба суроғаи Neon иваз кунед (нусхаи шабона аз ҳамин база).
7. Танҳо пас аз ҳамаи инҳо: Render → `filialhub-db` → Settings → **Delete database**.

> Neon-и ройгон: 0,5 ГБ ва ~100 соат кори протсессор дар моҳ. База вақте касе сайтро истифода намебарад
> худаш мехобад (`/api/health` ба база намеравад), пас барои як бизнес кифоя аст.
> Neon → **Usage**-ро моҳе як бор бинед. Агар ба ҳад наздик шавад, Supabase (ройгон, бе ҳадди соат) низ ҳамин тавр кор мекунад.

---

## Қадами 2. Сервер дар Oracle Cloud (≈40 дақиқа)

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
   `DATABASE_URL` — суроғаи Neon аз қадами 1. Дигар калидҳо (Telegram, Green-API, супер-админ, AI) — аз Render → Environment нусха кунед.
   `DOMAIN` ва `JWT_SECRET` худкор пур шудаанд. Сабт: `Ctrl+O`, `Enter`, `Ctrl+X`.
   > Агар `JWT_SECRET`-и Render-ро гузоред, корбарон аз аккаунт намебароянд.
7. Ба кор андохтан (бори аввал ~10 дақиқа):
   ```
   sg docker -c ~/filialhub/deploy/oracle/update.sh
   ```
   Дар охир суроға нишон дода мешавад, масалан `https://141-147-1-2.sslip.io` (HTTPS ройгон ва худкор).

---

## Қадами 3. Гузариш

1. Сайти навро санҷед: воридшавӣ, POS, фурӯш, чат, мағоза.
2. Render → `filialhub-web` → Settings → **Suspend Web Service**.
   **Ҳатман**: агар ҳарду кор кунанд, ҳисоботи рӯзона ва ёдраскуниҳо ду бор мераванд ва боти Telegram байни онҳо мепарад.
   Нест накунед — агар чизе шавад, **Resume** мекунед.
3. Боти Telegram ва Green-API webhook-ро худкор ба суроғаи нав мегузоранд (пас аз оғози сервер).
4. GitHub → Settings → Variables → `SITE_URL`-ро нест кунед (keep-awake дигар лозим нест).

## Deploy-и худкор (ихтиёрӣ)

GitHub → Settings → Secrets and variables → Actions:
- Variables → `ORACLE_HOST` = IP-и сервер
- Secrets → `ORACLE_SSH_KEY` = тамоми матни файли `.key`

Баъд аз ин ҳар push ба `main`, агар CI сабз бошад, сайтро дар сервер нав мекунад (`.github/workflows/deploy-oracle.yml`).

## Фармонҳои муфид (дар сервер)

```
cd ~/filialhub/deploy/oracle
docker compose logs --tail 100 app     # лог
docker compose restart app             # аз нав сар кардан
./update.sh                            # нав кардан бо дасти худ
```
