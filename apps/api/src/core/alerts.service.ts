import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

  notify(userIds: number | number[], alert: AlertInput) {
    const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
    if (!ids.length) return;
    this.prisma.alert
      .createMany({ data: ids.map((userId) => ({ userId, ...alert })) })
      .catch((e) => this.logger.warn(`Сохта нашуд: ${(e as Error).message}`));
  }

  /** Ба менеҷерони филиал (ва ихтиёрӣ ба шефҳо). */
  async notifyBranch(branchId: number, alert: AlertInput, opts: { includeChefs?: boolean; exceptUserId?: number } = {}) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
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
