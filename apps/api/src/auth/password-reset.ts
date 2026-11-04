import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Body, Controller, HttpCode, Injectable, Logger, Module, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramService } from '../notifications/telegram.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_CLIENT_EMAIL, DEMO_EMAILS } from './demo-guard';
import { Public } from './decorators';

export class ForgotDto {
  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;
}

export class ResetDto {
  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'Код 6 рақам аст' })
  code: string;

  @IsString() @MinLength(8, { message: 'Парол бояд камаш 8 аломат бошад' }) @MaxLength(100)
  password: string;
}

const CODE_TTL_MS = 10 * 60_000;
const MAX_TRIES = 5;
/** Дар 15 дақиқа на зиёда аз 3 код барои як почта — ботро барои спам истифода набаранд */
const MAX_SENDS = 3;
const SEND_WINDOW_MS = 15 * 60_000;

const sha = (s: string) => createHash('sha256').update(s).digest();

/** Ҷавоби якхела — аз рӯи он фаҳмидан мумкин нест, ки чунин почта ҳаст ё не */
export const FORGOT_REPLY = {
  ok: true,
  message: 'Агар ҳисоб бо ин почта бошад ва ба Telegram ё WhatsApp пайваст бошад, коди 6-рақама фиристода шуд. Код 10 дақиқа амал мекунад.',
};

type Entry = { hash: Buffer; exp: number; tries: number };

/**
 * «Паролро фаромӯш кардам»: коди 6-рақама ба Telegram-и пайвастшуда ва WhatsApp-и корбар.
 * Код танҳо ҳамчун hash дар хотираи процесс (як инстанси API) нигоҳ дошта мешавад — на дар база ва на дар
 * таърихи паёмҳо, то шеф ё админ онро дида натавонанд. Пас аз аз нав сар шудани сервер кодҳо нест мешаванд.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger('PasswordReset');
  private readonly codes = new Map<string, Entry>();
  private readonly sends = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async forgot(rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();
    // Ҳисобҳои демо барои ҳама кушодаанд — пароли онҳоро касе иваз карда наметавонад
    if (DEMO_EMAILS.includes(email) || email === DEMO_CLIENT_EMAIL) return FORGOT_REPLY;
    const now = Date.now();
    const recent = (this.sends.get(email) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
    if (recent.length >= MAX_SENDS) return FORGOT_REPLY;

    const target = await this.find(email);
    if (!target) return FORGOT_REPLY;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    // Сатри аввал бе код — лог-и dry-run танҳо сатри аввалро менависад
    const text = `🔐 FilialHub: барқарор кардани парол\nКоди шумо: <b>${code}</b>\nКод 10 дақиқа амал мекунад. Агар шумо нахостед — ин паёмро нодида гиред ва ба касе нагӯед.`;
    const jobs: Promise<{ status: string }>[] = [];
    if (target.telegramChatId) jobs.push(this.telegram.send(target.telegramChatId, text));
    if (target.whatsapp) jobs.push(this.whatsapp.send(target.whatsapp, text.replace(/<\/?b>/g, '*'), target.organizationId));
    if (!jobs.length) return FORGOT_REPLY;
    const sent = (await Promise.all(jobs.map((j) => j.catch(() => ({ status: 'FAILED' }))))).some((r) => r.status === 'SENT');
    if (!sent && isDev()) this.logger.warn(`[dev] Telegram/WhatsApp пайваст нест — коди ${email}: ${code}`);
    if (!sent && !isDev()) return FORGOT_REPLY;

    this.sends.set(email, [...recent, now]);
    this.codes.set(email, { hash: sha(code), exp: now + CODE_TTL_MS, tries: 0 });
    return FORGOT_REPLY;
  }

  async reset(rawEmail: string, code: string, password: string) {
    const email = rawEmail.toLowerCase().trim();
    const bad = () => new BadRequestException('Код нодуруст ё кӯҳна аст — коди навро гиред');
    const e = this.codes.get(email);
    if (!e || Date.now() > e.exp || e.tries >= MAX_TRIES) {
      this.codes.delete(email);
      throw bad();
    }
    e.tries++;
    if (!timingSafeEqual(e.hash, sha(code))) throw bad();
    const target = await this.find(email);
    if (!target) throw bad();
    const passwordHash = await bcrypt.hash(password, 10);
    // Ҳамаи дастгоҳҳое, ки бо пароли кӯҳна ворид шуда буданд (масалан телефони гумшуда), мебароянд
    const data = { passwordHash, passwordChangedAt: new Date() };
    if (target.kind === 'user') await this.prisma.user.update({ where: { id: target.id }, data });
    else await this.prisma.client.update({ where: { id: target.id }, data });
    this.codes.delete(email);
    this.sends.delete(email);
    this.logger.log(`Парол иваз шуд: ${target.kind} #${target.id}`);
    return { ok: true, message: 'Парол иваз шуд. Акнун бо пароли нав ворид шавед.' };
  }

  /** Корманд (фаъол) ё мизоҷи бозор; WhatsApp — танҳо рақами корманд (мизоҷ — танҳо Telegram-и пайвастшуда) */
  private async find(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true, telegramChatId: true, whatsapp: true, phone: true, organizationId: true } });
    if (user) {
      if (!user.isActive) return null;
      // Ширкатҳои демо (менеҷер, кассир… бо пароли demo1234) — ҳеҷ кас пароли онҳоро иваз карда наметавонад
      const demo = await this.prisma.organization.count({ where: { id: user.organizationId, users: { some: { email: { in: DEMO_EMAILS } } } } });
      if (demo) return null;
      return { kind: 'user' as const, id: user.id, telegramChatId: user.telegramChatId, whatsapp: user.whatsapp || user.phone || null, organizationId: user.organizationId };
    }
    const client = await this.prisma.client.findUnique({ where: { email }, select: { id: true, telegramChatId: true } });
    if (!client) return null;
    return { kind: 'client' as const, id: client.id, telegramChatId: client.telegramChatId, whatsapp: null, organizationId: null };
  }
}

/** Танҳо дар компютери худ (на Render): код дар лог-и сервер, то бе Telegram санҷида шавад */
function isDev() {
  return process.env.NODE_ENV !== 'production' && !process.env.RENDER;
}

@Controller('auth')
export class PasswordResetController {
  constructor(private readonly reset: PasswordResetService) {}

  @Public()
  @Post('forgot')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgot(@Body() dto: ForgotDto) {
    return this.reset.forgot(dto.email);
  }

  @Public()
  @Post('reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetDto) {
    return this.reset.reset(dto.email, dto.code, dto.password);
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [PasswordResetController],
  providers: [PasswordResetService],
})
export class PasswordResetModule {}
