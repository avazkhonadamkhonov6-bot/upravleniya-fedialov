import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Ҳимоя аз интихоби парол: пас аз MAX_FAILS кӯшиши нодуруст барои як почта
 * воридшавӣ то WINDOW_MS баста мешавад. Аз рӯи почта (на IP) ҳисоб мекунем —
 * API паси прокси-и Next аст ва IP-и ҳамаи корбарон якхела менамояд.
 * Хотираи процесс кифоя аст: як инстанси API; пас аз аз нав сар кардан ҳисоб тоза мешавад.
 */
const MAX_FAILS = 8;
const WINDOW_MS = 15 * 60_000;
const MAX_KEYS = 10_000;

export class LoginLimiter {
  private fails = new Map<string, { count: number; until: number }>();

  /** Пеш аз санҷиши парол: агар баста бошад — 429 */
  check(email: string) {
    const f = this.fails.get(email);
    if (!f) return;
    if (Date.now() > f.until) {
      this.fails.delete(email);
      return;
    }
    if (f.count >= MAX_FAILS) {
      throw new HttpException('Дархостҳо аз ҳад зиёданд. Каме истед ва аз нав кӯшиш кунед.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  fail(email: string) {
    const now = Date.now();
    const f = this.fails.get(email);
    if (f && now <= f.until) f.count++;
    else this.fails.set(email, { count: 1, until: now + WINDOW_MS });
    if (this.fails.size > MAX_KEYS) this.prune(now);
  }

  success(email: string) {
    this.fails.delete(email);
  }

  private prune(now: number) {
    for (const [k, f] of this.fails) if (now > f.until) this.fails.delete(k);
    // Агар ҳамаашон нав бошанд — кӯҳнатаринҳоро (аввали Map) мепартоем
    for (const k of this.fails.keys()) {
      if (this.fails.size <= MAX_KEYS) break;
      this.fails.delete(k);
    }
  }
}
