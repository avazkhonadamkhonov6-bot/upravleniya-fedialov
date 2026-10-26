import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { POSITIONS, type Branch as BranchDto, type Position } from '@filialhub/shared';
import type { AuthUser } from '../auth/decorators';
import { branchWhere, scopeBranch } from '../common/access';
import { toBranch } from '../common/serializers';
import { AuditService } from '../core/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser): Promise<BranchDto[]> {
    return this.query(branchWhere(user));
  }

  async get(user: AuthUser, id: number) {
    const [branch] = await this.query(scopeBranch(user, id) ?? id);
    if (!branch) throw new NotFoundException('Филиал ёфт нашуд');
    return branch;
  }

  private async query(branchId: number | { in: number[] }): Promise<BranchDto[]> {
    const branches = await this.prisma.branch.findMany({
      where: { id: branchId },
      orderBy: [{ isActive: 'desc' }, { id: 'asc' }],
      include: { users: { where: { isActive: true } } },
    });
    return branches.map((b) => {
      const manager = b.users.find((u) => u.role === 'MANAGER');
      const staff = b.users.filter((u) => u.role === 'STAFF');
      const byPos = Object.fromEntries(POSITIONS.map((p) => [p, 0])) as Record<Position, number>;
      staff.forEach((s) => s.position && byPos[s.position]++);
      return {
        ...toBranch(b),
        manager: manager
          ? { id: manager.id, fullName: manager.fullName, phone: manager.phone, email: manager.email, whatsapp: manager.whatsapp, telegram: manager.telegram }
          : null,
        staffCount: staff.length,
        staffByPosition: byPos,
      };
    });
  }

  async create(actor: AuthUser, dto: CreateBranchDto) {
    const b = await this.prisma.branch.create({
      data: { ...dto, organizationId: actor.organizationId, email: dto.email.toLowerCase(), openedAt: dto.openedAt ? new Date(dto.openedAt) : undefined },
    });
    this.audit.log(actor, 'CREATE', 'branch', b.id, `Филиали нав: ${b.name} (${b.city})`, b.id);
    return toBranch(b);
  }

  async update(actor: AuthUser, id: number, dto: UpdateBranchDto) {
    await this.ensure(actor, id);
    const b = await this.prisma.branch.update({
      where: { id },
      data: { ...dto, email: dto.email?.toLowerCase(), openedAt: dto.openedAt ? new Date(dto.openedAt) : undefined },
    });
    const what = dto.isActive === false ? 'ғайрифаъол шуд' : dto.isActive === true ? 'фаъол шуд' : 'тағйир ёфт';
    this.audit.log(actor, 'UPDATE', 'branch', id, `Филиал ${what}: ${b.name}`, id);
    return toBranch(b);
  }

  /**
   * Нест кардани филиал. Агар фурӯш дошта бошад — танҳо бо force=true (тасдиқи шеф):
   * фурӯшҳо, хароҷот, сменаҳо ва вазифаҳои филиал ҳам нест мешаванд; кормандон ғайрифаъол мешаванд.
   */
  async remove(actor: AuthUser, id: number, force = false) {
    const existing = await this.ensure(actor, id);
    const orders = await this.prisma.order.count({ where: { branchId: id } });
    if (orders > 0 && !force) {
      throw new BadRequestException(
        `Филиал ${orders} фармоиш дар таърих дорад. Ғайрифаъол кунед, то таърих нигоҳ дошта шавад, ё нест карданро тасдиқ кунед.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { branchId: id, role: { not: 'CHEF' } }, data: { isActive: false, branchId: null } }),
      this.prisma.branch.delete({ where: { id } }),
    ]);
    this.audit.log(actor, 'DELETE', 'branch', id, `Филиал нест шуд: ${existing.name}`);
    return { ok: true };
  }

  private async ensure(actor: AuthUser, id: number) {
    const b = await this.prisma.branch.findUnique({ where: { id } });
    if (!b || b.organizationId !== actor.organizationId) throw new NotFoundException('Филиал ёфт нашуд');
    return b;
  }
}
