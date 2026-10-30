import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events';
import { PushService } from './push';

export interface AlertInput {
  icon?: string;
  title: string;
  body?: string;
  link?: string;
}

/** Огоҳиномаҳои дохили сайт (🔔). */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger('Alerts');

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly push: PushService,
  ) {}

  notify(userIds: number | number[], alert: AlertInput) {
    const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
    if (!ids.length) return;
    this.prisma.alert
      .createMany({ data: ids.map((userId) => ({ userId, ...alert })) })
      .then(() => {
        this.events.emit(ids, 'alerts');
        // Ба телефон ҳам — агар сайт пӯшида бошад
        this.push.send(ids, { title: `${alert.icon ?? '🔔'} ${alert.title}`, body: alert.body, url: alert.link });
      })
      .catch((e) => this.logger.warn(`Сохта нашуд: ${(e as Error).message}`));
  }

  /** Ба менеҷерони филиал (ва ихтиёрӣ ба шефҳо). */
  async notifyBranch(branchId: number, alert: AlertInput, opts: { includeChefs?: boolean; exceptUserId?: number } = {}) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { organizationId: true } });
    if (!branch) return;
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        organizationId: branch.organizationId,
        OR: [{ role: 'MANAGER', branchId }, ...(opts.includeChefs ? [{ role: 'CHEF' as const }] : [])],
      },
      select: { id: true },
    });
    this.notify(
      users.map((u) => u.id).filter((id) => id !== opts.exceptUserId),
      alert,
    );
  }
}
