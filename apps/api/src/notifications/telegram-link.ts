import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Коди пайвасти Telegram барои пайванди t.me/<bot>?start=<код>.
 * Код = id + имзои HMAC бо JWT_SECRET — сохтани коди шахси дигар бе калиди сервер ғайриимкон аст.
 * Telegram танҳо [A-Za-z0-9_-] то 64 аломатро иҷозат медиҳад.
 */
const sign = (userId: number) =>
  createHmac('sha256', process.env.JWT_SECRET || 'filialhub-dev-secret').update(`tg-link:${userId}`).digest('base64url').slice(0, 24);

export function telegramLinkCode(userId: number): string {
  return `u${userId}_${sign(userId)}`;
}

export function verifyTelegramLinkCode(code: string): number | null {
  const m = /^u(\d+)_([A-Za-z0-9_-]{24})$/.exec(code);
  if (!m) return null;
  const id = Number(m[1]);
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
