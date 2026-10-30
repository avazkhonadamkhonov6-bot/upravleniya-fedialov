// Бояд пеш аз ҳама модулҳо import шавад, то @Cron ва дигар декораторҳо .env-ро бинанд.
import 'dotenv/config';

// Бе JWT_SECRET ҳар кас бо калиди маълуми 'filialhub-dev-secret' токени шеф сохта метавонад — дар сервер манъ.
if (!process.env.JWT_SECRET && (process.env.NODE_ENV === 'production' || process.env.RENDER)) {
  throw new Error('JWT_SECRET гузошта нашудааст — API бе он дар production сар намешавад');
}
