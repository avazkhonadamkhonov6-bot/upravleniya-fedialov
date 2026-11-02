/**
 * Ҳисобҳои демо барои ҳама кушодаанд (пароли demo1234 дар саҳифаи воридшавӣ навишта шудааст).
 * Касе онҳоро вайрон накунад: нест кардан, ивази парол/почта, ғайрифаъол кардан ва танзимҳои бизнес хомӯшанд.
 * Фурӯш, мол, мизоҷ ва вазифаи нав — мумкин, то ҳама чизро санҷида тавонанд.
 */
export const DEMO_EMAILS = ['chef@filialhub.tj', 'shop@filialhub.tj', 'grocery@filialhub.tj'];
export const DEMO_CLIENT_EMAIL = 'client@filialhub.tj';

export const DEMO_BLOCKED_MESSAGE = 'Дар ҳисоби демо ин амал хомӯш аст, то демо барои ҳама саломат монад. Бизнеси худро ройгон созед ва ҳамаашро санҷед.';

const SETTINGS_PATHS = ['/api/auth/organization', '/api/integrations'];
/** Ҳисобҳои воридшавӣ: дар ин ҷо почта ва парол — маълумоти даромадан аст (дар филиал ва мизоҷ — танҳо тамос) */
const ACCOUNT_PATHS = ['/api/auth/me', '/api/users', '/api/shop/me'];
const under = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + '/'));

/** true — ин дархост деморо вайрон мекунад */
export function isDemoBlocked(method: string, path: string, body: unknown): boolean {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return false;
  if (m === 'DELETE') return true;
  if (under(path, SETTINGS_PATHS)) return true;
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  // Тағйир (PATCH/PUT): ивази парол ва почта — бо ин ҳисобро аз дигарон мегиранд. Корманди нав (POST) — мумкин.
  if (m !== 'POST' && under(path, ACCOUNT_PATHS) && ['password', 'newPassword', 'currentPassword', 'email'].some((k) => b[k] !== undefined && b[k] !== '')) return true;
  return b.isActive === false;
}
