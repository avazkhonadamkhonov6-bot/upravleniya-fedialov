import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { Alert, AuditEntry, SearchResult } from '@filialhub/shared';
import { canSell, POSITION_LABELS, ROLE_LABELS } from '@filialhub/shared';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<{ items: Alert[]; unread: number }> {
    const [rows, unread] = await Promise.all([
      this.prisma.alert.findMany({ where: { userId: user.id }, orderBy: { id: 'desc' }, take: 30 }),
      this.prisma.alert.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return {
      unread,
      items: rows.map((a) => ({
        id: a.id,
        icon: a.icon,
        title: a.title,
        body: a.body,
        link: a.link,
        readAt: a.readAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  @Post('read-all')
  @HttpCode(200)
  async readAll(@CurrentUser() user: AuthUser) {
    await this.prisma.alert.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  @Post(':id/read')
  @HttpCode(200)
  async read(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.prisma.alert.updateMany({ where: { id, userId: user.id }, data: { readAt: new Date() } });
    return { ok: true };
  }
}

@Controller('audit')
@Roles('CHEF')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('entity') entity?: string, @Query('page') page?: string): Promise<{ items: AuditEntry[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = entity ? { entity } : {};
    const p = Math.max(Number(page) || 1, 1);
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true } } },
        // Аз рӯи вақт (сабтҳои намунавӣ бо санаи гузашта баъдтар сохта мешаванд — id тартибро намедиҳад)
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (p - 1) * 30,
        take: 30,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action as AuditEntry['action'],
        entity: r.entity,
        entityId: r.entityId,
        summary: r.summary,
        userName: r.user?.fullName ?? null,
        branchId: r.branchId,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}

/** Ҷустуҷӯи умумӣ (Ctrl+K) — натиҷаҳо аз рӯи ҳуқуқи корбар маҳдуд мешаванд. */
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@CurrentUser() user: AuthUser, @Query('q') q = ''): Promise<SearchResult[]> {
    const term = q.trim();
    if (term.length < 2) return [];
    const like = { contains: term, mode: 'insensitive' as const };
    const own = user.role === 'CHEF' ? undefined : (user.branchId ?? -1);
    const staffOnly = user.role === 'STAFF';

    const [users, customers, branches, products] = await Promise.all([
      staffOnly
        ? []
        : this.prisma.user.findMany({
            where: { branchId: own, OR: [{ fullName: like }, { email: like }, { phone: { contains: term } }] },
            include: { branch: true },
            take: 6,
          }),
      staffOnly && !canSell(user)
        ? []
        : this.prisma.customer.findMany({
            where: { branchId: staffOnly ? undefined : own, OR: [{ fullName: like }, { phone: { contains: term } }] },
            take: 6,
          }),
      this.prisma.branch.findMany({ where: { id: own, OR: [{ name: like }, { city: like }] }, take: 5 }),
      this.prisma.product.findMany({ where: { isActive: true, name: like }, take: 5 }),
    ]);

    return [
      ...users.map((u) => ({
        type: 'user' as const,
        id: u.id,
        title: u.fullName,
        subtitle: `${u.position ? POSITION_LABELS[u.position] : ROLE_LABELS[u.role]} · ${u.branch?.name ?? 'Ҳамаи филиалҳо'} · ${u.phone}`,
        href: `/staff?q=${encodeURIComponent(u.fullName)}`,
      })),
      ...customers.map((c) => ({
        type: 'customer' as const,
        id: c.id,
        title: c.fullName,
        subtitle: `${c.phone} · ${c.points} балл`,
        href: staffOnly ? `/pos?phone=${encodeURIComponent(c.phone)}` : `/customers/view?id=${c.id}`,
      })),
      ...branches.map((b) => ({
        type: 'branch' as const,
        id: b.id,
        title: b.name,
        subtitle: `${b.city}, ${b.address}`,
        href: `/branches/view?id=${b.id}`,
      })),
      ...products.map((p) => ({
        type: 'product' as const,
        id: p.id,
        title: `${p.emoji} ${p.name}`,
        subtitle: `${p.category} · ${Number(p.price)} сомонӣ`,
        href: '/products',
      })),
    ];
  }
}
