import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Ҳудуди дархостҳо барои ҳамаи API. API паси прокси-и Next ва Render аст, бинобар ин IP аз x-forwarded-for
 * гирифта мешавад. Корбари воридшуда аз рӯи токенаш ҳисоб мешавад — кормандони як мағоза бо як Wi-Fi
 * (як IP) ҳудуди якдигарро намехӯранд.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const auth: string | undefined = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return `t:${createHash('sha256').update(auth.slice(7)).digest('base64url').slice(0, 22)}`;
    const xff = req.headers?.['x-forwarded-for'];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
    return `ip:${first || req.ip}`;
  }
}
