import { Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

/** Таърихи амалҳо: кӣ, кай ва чӣ тағйир дод. Хатои сабт ҳеҷ гоҳ амали асосиро вайрон намекунад. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  log(
    actor: AuthUser,
    action: AuditAction,
    entity: string,
    entityId: number | null,
    summary: string,
    branchId?: number | null,
  ) {
    this.prisma.auditLog
      .create({ data: { userId: actor.id, action, entity, entityId, summary, branchId: branchId ?? null } })
      .catch((e) => this.logger.warn(`Сабт нашуд: ${(e as Error).message}`));
  }
}
