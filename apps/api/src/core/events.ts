import { Controller, Get, Injectable, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ServerEvent } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';

/**
 * Хабарҳои фаврӣ ба браузер (Server-Sent Events): «паёми нав ҳаст», «занг омад», «🔔 нав».
 * Маълумоти худро намефиристем — браузер танҳо дархости маъмулиро фавран такрор мекунад.
 * Хотираи процесс кифоя аст: як инстанси API. Агар пайваст канда шавад, polling-и суст кор мекунад.
 */
@Injectable()
export class EventsService {
  private listeners = new Map<number, Set<(type: ServerEvent) => void>>();

  subscribe(userId: number, fn: (type: ServerEvent) => void) {
    let set = this.listeners.get(userId);
    if (!set) this.listeners.set(userId, (set = new Set()));
    set.add(fn);
    return () => {
      set.delete(fn);
      if (!set.size) this.listeners.delete(userId);
    };
  }

  emit(userIds: number | number[], type: ServerEvent) {
    for (const id of new Set(Array.isArray(userIds) ? userIds : [userIds])) {
      this.listeners.get(id)?.forEach((fn) => fn(type));
    }
  }
}

@Controller('events')
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
    const off = this.events.subscribe(user.id, (type) => res.write(`event: ${type}\ndata: {}\n\n`));
    // Пайвасти бекорро прокси мебурад — ҳар 25 сония сатри холӣ
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(ping);
      off();
    });
  }
}
