// Суроғаи ҷамъиятии сайт барои SEO (canonical, Open Graph, sitemap).
export const SITE_URL = (process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "https://filialhub-web.onrender.com").replace(/\/$/, "");
export const SITE_NAME = "FilialHub";
export const SITE_DESCRIPTION =
  "FilialHub — CRM барои шабакаи тарабхонаҳо ва филиалҳо: фурӯш ва фоида рӯзона, ҳафтаина ва моҳона, кормандон, кассирҳо, мизоҷон ва бонус, ҷадвал ва давомот, ҳисобот ба Telegram ва WhatsApp.";
