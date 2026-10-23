import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeTelegram, POSITION_LABELS, ROLE_LABELS, type Position, type Role } from '@filialhub/shared';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../auth/decorators';
import { scopeBranch } from '../common/access';
import { toUser } from '../common/serializers';
import { Prisma } from '../generated/prisma/client';
import { AlertsService } from '../core/alerts.service';
import { AuditService } from '../core/audit.service';
import { escape, NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

export interface UserFilters {
  branchId?: number;
  role?: Role;
  position?: Position;
  search?: string;
  includeInactive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
  ) {}

  async list(actor: AuthUser, f: UserFilters) {
    const branchId = scopeBranch(actor, f.branchId);
    const where: Prisma.UserWhereInput = {
      branchId,
      role: f.role ?? (actor.role === 'MANAGER' ? { in: ['MANAGER', 'STAFF'] } : undefined),
      position: f.position,
      isActive: f.includeInactive ? undefined : true,
    };
    if (f.search?.trim()) {
      const q = f.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
    const users = await this.prisma.user.findMany({
      where,
      include: { branch: true },
      orderBy: [{ role: 'asc' }, { branchId: 'asc' }, { position: 'asc' }, { fullName: 'asc' }],
    });
    return users.map(toUser);
  }

  async get(actor: AuthUser, id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { branch: true } });
    if (!user) throw new NotFoundException('Корманд ёфт нашуд');
    if (actor.role !== 'CHEF' && user.id !== actor.id) {
      if (user.role === 'CHEF') throw new ForbiddenException('Шумо ҳуқуқ надоред');
      scopeBranch(actor, user.branchId ?? -1);
    }
    return toUser(user);
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    if (actor.role === 'MANAGER') {
      if (dto.role !== 'STAFF') throw new ForbiddenException('Менеҷер танҳо корманд илова карда метавонад');
      dto.branchId = actor.branchId!;
    }
    await this.validateShape(dto.role, dto.position, dto.branchId);
    if (dto.role === 'MANAGER') await this.ensureNoOtherManager(dto.branchId!);

    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Ин почтаи электронӣ аллакай истифода шудааст');
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone.trim(),
        whatsapp: dto.whatsapp?.trim() ?? '',
        telegram: dto.telegram ? normalizeTelegram(dto.telegram) : '',
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        position: dto.role === 'STAFF' ? dto.position : null,
        branchId: dto.branchId,
        salary: dto.salary ?? 0,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
      },
      include: { branch: true },
    });

    void this.notifications.welcome(user);
    const label0 = user.position ? POSITION_LABELS[user.position] : ROLE_LABELS[user.role];
    this.audit.log(actor, 'CREATE', 'user', user.id, `Корманди нав: ${user.fullName} — ${label0}${user.branch ? ' (' + user.branch.name + ')' : ''}`, user.branchId);
    this.alerts.notify(user.id, { icon: '🎉', title: 'Хуш омадед ба FilialHub!', body: `Шумо ҳамчун ${label0} сабт шудед`, link: '/profile' });
    if (user.branchId) {
      void this.alerts.notifyBranch(user.branchId, { icon: '🆕', title: `Корманди нав: ${user.fullName}`, body: label0, link: '/staff' }, { exceptUserId: actor.id });
    }
    if (user.branchId) {
      const label = user.position ? POSITION_LABELS[user.position] : ROLE_LABELS[user.role];
      void this.notifications.notifyBranchManagers(
        user.branchId,
        `🆕 Корманди нав дар филиали шумо: <b>${escape(user.fullName)}</b> — ${label}\n📞 ${user.phone}`,
        actor.role === 'MANAGER' ? actor.id : user.id,
      );
    }
    return toUser(user);
  }

  async update(actor: AuthUser, id: number, dto: UpdateUserDto) {
    const target = await this.ensureEditable(actor, id);
    if (actor.role === 'MANAGER' && (dto.role || dto.branchId !== undefined)) {
      throw new ForbiddenException('Менеҷер нақш ё филиали кормандро иваз карда наметавонад');
    }

    const role = dto.role ?? (target.role as 'MANAGER' | 'STAFF');
    const position = role === 'STAFF' ? (dto.position ?? target.position ?? undefined) : undefined;
    const branchId = dto.branchId ?? target.branchId ?? undefined;
    await this.validateShape(role, position, branchId);
    if (role === 'MANAGER' && (target.role !== 'MANAGER' || branchId !== target.branchId)) {
      await this.ensureNoOtherManager(branchId!, id);
    }

    const email = dto.email?.toLowerCase().trim();
    if (email && email !== target.email && (await this.prisma.user.findUnique({ where: { email } }))) {
      throw new ConflictException('Ин почтаи электронӣ аллакай истифода шудааст');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        email,
        phone: dto.phone?.trim(),
        whatsapp: dto.whatsapp?.trim(),
        telegram: dto.telegram !== undefined ? normalizeTelegram(dto.telegram) : undefined,
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
        role,
        position: position ?? null,
        branchId,
        salary: dto.salary,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
        isActive: dto.isActive,
      },
      include: { branch: true },
    });

    const changes = [
      dto.isActive === false && 'ғайрифаъол шуд',
      dto.isActive === true && !target.isActive && 'фаъол шуд',
      dto.salary !== undefined && dto.salary !== target.salary && `маош: ${target.salary} → ${dto.salary}`,
      dto.position && dto.position !== target.position && `вазифа: ${POSITION_LABELS[dto.position]}`,
      dto.role && dto.role !== target.role && `нақш: ${ROLE_LABELS[dto.role]}`,
      dto.branchId && dto.branchId !== target.branchId && 'филиал иваз шуд',
      dto.password && 'парол иваз шуд',
    ].filter(Boolean);
    this.audit.log(actor, 'UPDATE', 'user', id, `${user.fullName}: ${changes.length ? changes.join(', ') : 'маълумот тағйир ёфт'}`, user.branchId);

    if (actor.role === 'CHEF' && user.branchId && user.role === 'STAFF') {
      void this.notifications.notifyBranchManagers(
        user.branchId,
        `✏️ Маълумоти корманд тағйир ёфт: <b>${escape(user.fullName)}</b>${user.isActive ? '' : ' (ғайрифаъол)'}`,
      );
    }
    return toUser(user);
  }

  async remove(actor: AuthUser, id: number) {
    if (id === actor.id) throw new BadRequestException('Худатонро нест карда наметавонед');
    const target = await this.ensureEditable(actor, id);
    await this.prisma.user.delete({ where: { id } });
    this.audit.log(actor, 'DELETE', 'user', id, `Корманд нест шуд: ${target.fullName}`, target.branchId);
    if (target.branchId && actor.role === 'CHEF' && target.role === 'STAFF') {
      void this.notifications.notifyBranchManagers(
        target.branchId,
        `🗑 Корманд аз филиал хориҷ шуд: <b>${escape(target.fullName)}</b>`,
      );
    }
    return { ok: true };
  }

  private async ensureEditable(actor: AuthUser, id: number) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Корманд ёфт нашуд');
    if (target.role === 'CHEF') throw new ForbiddenException('Профили шефро аз саҳифаи «Профил» тағйир диҳед');
    if (actor.role === 'MANAGER') {
      if (target.role !== 'STAFF' || target.branchId !== actor.branchId) {
        throw new ForbiddenException('Шумо танҳо кормандони филиали худатонро идора карда метавонед');
      }
    }
    return target;
  }

  private async validateShape(role: Role, position?: Position, branchId?: number) {
    if (!branchId) throw new BadRequestException('Филиалро интихоб кунед');
    if (role === 'STAFF' && !position) throw new BadRequestException('Вазифаи кормандро интихоб кунед');
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new BadRequestException('Филиал ёфт нашуд');
  }

  private async ensureNoOtherManager(branchId: number, exceptId?: number) {
    const existing = await this.prisma.user.findFirst({
      where: { branchId, role: 'MANAGER', isActive: true, id: exceptId ? { not: exceptId } : undefined },
    });
    if (existing) {
      throw new ConflictException(`Ин филиал аллакай менеҷер дорад: ${existing.fullName}`);
    }
  }
}
