import { Body, Controller, Get, HttpCode, Injectable, Logger, Post } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import webpush from 'web-push';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body?: string;
  /** Ҳангоми пахш кушода мешавад */
  url?: string;
  /** Огоҳиҳои ҳамон tag якдигарро иваз мекунанд (масалан «call») */
  tag?: string;
}

export class SubscribeDto {
  @IsString() @MaxLength(1000)
  endpoint: string;

  @IsString() @MaxLength(200)
  p256dh: string;

  @IsString() @MaxLength(100)
  auth: string;
}

export class UnsubscribeDto {
  @IsString() @MaxLength(1000)
  endpoint: string;
}

/**
 * Огоҳӣ ба телефон ва компютер (Web Push), ҳатто вақте ки сайт пӯшида аст. Ройгон: хидматҳои push-и худи браузерҳо.
 * Калидҳои VAPID аз .env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) ё бори аввал худкор сохта ва дар база нигоҳ дошта мешаванд.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  private keys: Promise<{ publicKey: string; privateKey: string }> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private vapid() {
    this.keys ??= (async () => {
      const fromEnv = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
      let keys = fromEnv ? { publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! } : null;
      if (!keys) {
        const saved = await this.prisma.appSetting.findUnique({ where: { key: 'vapid' } });
        keys = saved ? (JSON.parse(saved.value) as { publicKey: string; privateKey: string }) : null;
      }
      if (!keys) {
        keys = webpush.generateVAPIDKeys();
        // Агар ду процесс ҳамзамон созанд — аввалин мемонад
        await this.prisma.appSetting.upsert({ where: { key: 'vapid' }, create: { key: 'vapid', value: JSON.stringify(keys) }, update: {} });
        const winner = await this.prisma.appSetting.findUniqueOrThrow({ where: { key: 'vapid' } });
        keys = JSON.parse(winner.value) as { publicKey: string; privateKey: string };
        this.logger.log('Калидҳои VAPID сохта шуданд');
      }
      webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL ?? 'admin@filialhub.tj'}`, keys.publicKey, keys.privateKey);
      return keys;
    })();
    return this.keys;
  }

  async publicKey() {
    return (await this.vapid()).publicKey;
  }

  async subscribe(userId: number, dto: SubscribeDto) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth },
      update: { userId, p256dh: dto.p256dh, auth: dto.auth },
    });
  }

  async unsubscribe(userId: number, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /** Ба ҳамаи браузерҳои ин корбарон; обунаҳои мурда (404/410) нест карда мешаванд */
  send(userIds: number | number[], payload: PushPayload) {
    const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
    if (!ids.length) return;
    void (async () => {
      await this.vapid();
      const subs = await this.prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
      const body = JSON.stringify(payload);
      await Promise.all(
        subs.map((s) =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 }).catch(async (e: { statusCode?: number; message?: string }) => {
            if (e.statusCode === 404 || e.statusCode === 410) await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
            else this.logger.warn(`Push → #${s.userId}: ${e.statusCode ?? ''} ${e.message ?? ''}`);
          }),
        ),
      );
    })().catch((e) => this.logger.warn((e as Error).message));
  }
}

@Controller('push')
@Feature('profile')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('key')
  async key() {
    return { key: await this.push.publicKey() };
  }

  @Post('subscribe')
  @HttpCode(204)
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.push.subscribe(user.id, dto);
  }

  @Post('unsubscribe')
  @HttpCode(204)
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribeDto) {
    return this.push.unsubscribe(user.id, dto.endpoint);
  }
}
