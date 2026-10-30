import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Injectable, Logger, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Presence, ServerEvent } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

type Listener = (type: ServerEvent, data?: object) => void;

/** Пас аз канда шудани охирин пайваст ин қадар интизор мешавем — нав кардани саҳифа «баромад» нест */
const OFFLINE_GRACE_MS = 8_000;

/**
 * Хабарҳои фаврӣ ба браузер (Server-Sent Events): «паёми нав ҳаст», «занг омад», «🔔 нав».
 * Одатан маълумот намефиристем — браузер танҳо дархости маъмулиро фавран такрор мекунад.
 * Истисно: «activity» (менависад/сабт мекунад) ва «presence» (дар шабака) — хурданд ва ба база намераванд.
 * Хотираи процесс кифоя аст: як инстанси API. Агар пайваст канда шавад, polling-и суст кор мекунад.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger('Events');
  private listeners = new Map<number, Set<Listener>>();
  /** Корбарони пайвастшуда аз рӯи ширкат — барои хабарҳои умумӣ (фармоиши нав) */
  private orgUsers = new Map<number, Set<number>>();
  private offlineTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(private readonly prisma: PrismaService) {}

  /** Корбар ҳоло сайтро кушода дорад (ақаллан як пайвасти /api/events) */
  isOnline(userId: number) {
    return this.listeners.has(userId);
  }

  subscribe(userId: number, organizationId: number, fn: Listener) {
    let set = this.listeners.get(userId);
    if (!set) {
      this.listeners.set(userId, (set = new Set()));
      // Дар муҳлати OFFLINE_GRACE_MS баргашт (саҳифаро нав кард) — касе «баромад»-ро намебинад
      const pending = this.offlineTimers.get(userId);
      if (pending) {
        clearTimeout(pending);
        this.offlineTimers.delete(userId);
      } else {
        this.emitOrg(organizationId, 'presence', { userId, online: true, lastSeenAt: null } satisfies Presence);
      }
    }
    const own = set;
    own.add(fn);
    let users = this.orgUsers.get(organizationId);
    if (!users) this.orgUsers.set(organizationId, (users = new Set()));
    users.add(userId);
    return () => {
      own.delete(fn);
      if (own.size || this.listeners.get(userId) !== own) return;
      this.listeners.delete(userId);
      users.delete(userId);
      if (!users.size) this.orgUsers.delete(organizationId);
      this.offlineTimers.set(
        userId,
        setTimeout(() => {
          this.offlineTimers.delete(userId);
          if (this.listeners.has(userId)) return;
          const lastSeenAt = new Date();
          this.emitOrg(organizationId, 'presence', { userId, online: false, lastSeenAt: lastSeenAt.toISOString() } satisfies Presence);
          this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt } }).catch((e) => this.logger.warn(`lastSeenAt: ${(e as Error).message}`));
        }, OFFLINE_GRACE_MS),
      );
    };
  }

  /** Ба ҳамаи кормандони пайвасти ширкат */
  emitOrg(organizationId: number, type: ServerEvent, data?: object) {
    this.emit([...(this.orgUsers.get(organizationId) ?? [])], type, data);
  }

  emit(userIds: number | number[], type: ServerEvent, data?: object) {
    for (const id of new Set(Array.isArray(userIds) ? userIds : [userIds])) {
      this.listeners.get(id)?.forEach((fn) => fn(type, data));
    }
  }
}

@Controller('events')
@SkipThrottle()
@Feature('profile')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  stream(@CurrentUser() user: AuthUser, @Req() req: Request, @Res() res: Response) {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Проксиҳо (nginx/Render) ҷавобро нигоҳ надоранд
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 5000\n\n');
    const off = this.events.subscribe(user.id, user.organizationId, (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data ?? {})}\n\n`));
    // Пайвасти бекорро прокси мебурад — ҳар 25 сония сатри холӣ
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(ping);
      off();
    });
  }
}
