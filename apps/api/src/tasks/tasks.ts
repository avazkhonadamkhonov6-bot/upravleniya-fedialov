import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Priority,
  type Task as TaskDto,
  type TaskStatus,
} from '@filialhub/shared';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { scopeBranch } from '../common/access';
import { AlertsService } from '../core/alerts.service';
import { AuditService } from '../core/audit.service';
import { Prisma } from '../generated/prisma/client';
import { escape, NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export class CreateTaskDto {
  @IsString() @MinLength(3, { message: 'Сарлавҳаи вазифаро нависед' }) @MaxLength(120)
  title: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsIn(PRIORITIES)
  priority?: Priority;

  @IsOptional() @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsDateString()
  dueDate?: string | null;

  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt()
  assigneeId?: number | null;
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120)
  declare title: string;
}

const include = {
  branch: { select: { name: true } },
  assignee: { select: { id: true, fullName: true, position: true, role: true, telegramChatId: true, phone: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof include }>;

function toTask(t: TaskRow): TaskDto {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    branchId: t.branchId,
    branchName: t.branch?.name ?? null,
    assignee: t.assignee
      ? { id: t.assignee.id, fullName: t.assignee.fullName, position: t.assignee.position, role: t.assignee.role }
      : null,
    createdBy: t.createdBy,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    overdue: !!t.dueDate && t.status !== 'DONE' && t.dueDate < new Date(),
  };
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, q: { branchId?: number; assigneeId?: number; mine?: boolean }) {
    const where: Prisma.TaskWhereInput =
      user.role === 'STAFF'
        ? { assigneeId: user.id }
        : {
            branchId: scopeBranch(user, q.branchId),
            assigneeId: q.mine ? user.id : q.assigneeId,
          };
    const rows = await this.prisma.task.findMany({
      where,
      include,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'desc' }],
      take: 300,
    });
    // Вазифаҳои тайёри кӯҳна (беш аз 14 рӯз) тахтаро пур накунанд.
    const cutoff = Date.now() - 14 * 86400000;
    return rows.filter((t) => t.status !== 'DONE' || !t.completedAt || t.completedAt.getTime() > cutoff).map(toTask);
  }

  async create(user: AuthUser, dto: CreateTaskDto) {
    const { branchId, assigneeId } = await this.resolveTarget(user, dto.branchId, dto.assigneeId ?? null);
    const status = dto.status ?? 'TODO';
    const t = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        priority: dto.priority ?? 'MEDIUM',
        status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        branchId,
        assigneeId,
        createdById: user.id,
        completedAt: status === 'DONE' ? new Date() : null,
      },
      include,
    });
    this.audit.log(user, 'CREATE', 'task', t.id, `Вазифаи нав: «${t.title}»`, branchId);
    if (t.assignee && t.assignee.id !== user.id) this.notifyAssignee(t, user);
    return toTask(t);
  }

  async update(user: AuthUser, id: number, dto: UpdateTaskDto) {
    const existing = await this.ensure(user, id);

    // Корманд танҳо ҳолати вазифаи худашро иваз мекунад.
    if (user.role === 'STAFF') {
      const keys = Object.keys(dto).filter((k) => (dto as unknown as Record<string, unknown>)[k] !== undefined);
      if (keys.some((k) => k !== 'status')) throw new ForbiddenException('Шумо танҳо ҳолати вазифаро иваз карда метавонед');
    }

    let target = { branchId: existing.branchId, assigneeId: existing.assigneeId };
    if (user.role !== 'STAFF' && (dto.assigneeId !== undefined || dto.branchId !== undefined)) {
      target = await this.resolveTarget(
        user,
        dto.branchId ?? existing.branchId ?? undefined,
        dto.assigneeId === undefined ? existing.assigneeId : dto.assigneeId,
      );
    }

    const status = dto.status ?? existing.status;
    const t = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        priority: dto.priority,
        status,
        dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
        branchId: target.branchId,
        assigneeId: target.assigneeId,
        completedAt: status === 'DONE' ? (existing.completedAt ?? new Date()) : null,
      },
      include,
    });

    if (dto.status && dto.status !== existing.status) {
      this.audit.log(user, 'UPDATE', 'task', id, `«${t.title}»: ${TASK_STATUS_LABELS[existing.status]} → ${TASK_STATUS_LABELS[t.status]}`, t.branchId);
      if (t.status === 'DONE' && t.createdBy && t.createdBy.id !== user.id) {
        this.alerts.notify(t.createdBy.id, {
          icon: '✅',
          title: `Вазифа иҷро шуд: ${t.title}`,
          body: `${user.fullName} вазифаро тайёр кард`,
          link: '/tasks',
        });
      }
    } else {
      this.audit.log(user, 'UPDATE', 'task', id, `Вазифа тағйир ёфт: «${t.title}»`, t.branchId);
    }
    if (t.assignee && t.assignee.id !== existing.assigneeId && t.assignee.id !== user.id) this.notifyAssignee(t, user);
    return toTask(t);
  }

  async remove(user: AuthUser, id: number) {
    if (user.role === 'STAFF') throw new ForbiddenException('Шумо ҳуқуқ надоред');
    const t = await this.ensure(user, id);
    await this.prisma.task.delete({ where: { id } });
    this.audit.log(user, 'DELETE', 'task', id, `Вазифа нест шуд: «${t.title}»`, t.branchId);
    return { ok: true };
  }

  private async ensure(user: AuthUser, id: number) {
    const t = await this.prisma.task.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Вазифа ёфт нашуд');
    if (user.role === 'STAFF' && t.assigneeId !== user.id) throw new ForbiddenException('Ин вазифаи шумо нест');
    if (user.role === 'MANAGER' && t.branchId !== user.branchId) {
      throw new ForbiddenException('Шумо танҳо вазифаҳои филиали худатонро идора мекунед');
    }
    return t;
  }

  /** Филиал ва иҷрокунандаро месанҷад: менеҷер танҳо дар филиали худ. */
  private async resolveTarget(user: AuthUser, branchId: number | undefined, assigneeId: number | null) {
    if (user.role === 'STAFF') throw new ForbiddenException('Шумо ҳуқуқ надоред');
    let b = user.role === 'MANAGER' ? user.branchId! : branchId;
    if (assigneeId) {
      const a = await this.prisma.user.findUnique({ where: { id: assigneeId } });
      if (!a || !a.isActive) throw new BadRequestException('Иҷрокунанда ёфт нашуд');
      if (user.role === 'MANAGER' && a.branchId !== user.branchId) {
        throw new ForbiddenException('Иҷрокунанда бояд аз филиали шумо бошад');
      }
      if (!b) b = a.branchId ?? undefined;
      if (a.branchId && b && a.branchId !== b) throw new BadRequestException('Иҷрокунанда дар филиали дигар кор мекунад');
    }
    if (!b) throw new BadRequestException('Филиалро интихоб кунед');
    return { branchId: b, assigneeId };
  }

  private notifyAssignee(t: TaskRow, actor: AuthUser) {
    const due = t.dueDate ? `\n⏰ Мӯҳлат: ${t.dueDate.toLocaleDateString('ru-RU')}` : '';
    this.alerts.notify(t.assignee!.id, {
      icon: t.priority === 'HIGH' ? '🔥' : '📋',
      title: `Вазифаи нав: ${t.title}`,
      body: `${actor.fullName} ба шумо вазифа дод · ${PRIORITY_LABELS[t.priority]}`,
      link: '/tasks',
    });
    void this.notifications.notifyUser(
      { id: t.assignee!.id, phone: t.assignee!.phone, telegramChatId: t.assignee!.telegramChatId },
      `📋 <b>Вазифаи нав</b>: ${escape(t.title)}\nАфзалият: ${PRIORITY_LABELS[t.priority]}${due}\nАз: ${escape(actor.fullName)}`,
    );
  }
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('mine') mine?: string,
  ) {
    return this.tasks.list(user, {
      branchId: Number(branchId) || undefined,
      assigneeId: Number(assigneeId) || undefined,
      mine: mine === 'true',
    });
  }

  @Post()
  @Roles('CHEF', 'MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('CHEF', 'MANAGER')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.remove(user, id);
  }
}

@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
