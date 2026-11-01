import { BadRequestException, Controller, Get, Injectable, Module, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { POSITION_LABELS, ROLE_LABELS, type Payroll, type PayrollRow } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { scopeBranch } from '../common/access';
import { localDay } from '../common/time';
import { xlsx, XLSX_TYPE } from '../common/xlsx';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { shiftState } from '../shifts/shifts';

const r1 = (n: number) => Math.round(n * 10) / 10;

/** «2026-10» → [оғози моҳ, оғози моҳи оянда) бо вақти Душанбе; холӣ — моҳи ҷорӣ */
export function monthRange(month?: string, now = new Date()): { key: string; from: Date; to: Date } {
  const key = month || localDay(now).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new BadRequestException('Моҳ нодуруст аст (YYYY-MM)');
  const [y, m] = key.split('-').map(Number);
  const from = new Date(`${key}-01T00:00:00+05:00`);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { key, from, to: new Date(`${next}-01T00:00:00+05:00`) };
}

type ShiftLite = { startsAt: Date; endsAt: Date; checkInAt: Date | null; checkOutAt: Date | null; isAdHoc?: boolean };

/** Ҳисоби як корманд аз сменаҳои моҳ (бе база — барои тест) */
export function summarize(salary: number, shifts: ShiftLite[], now = new Date()) {
  let planned = 0, attended = 0, lateCount = 0, lateMinutes = 0, absent = 0, hours = 0;
  const days = new Set<string>();
  for (const s of shifts) {
    const { state, lateMinutes: late } = shiftState(s, now);
    // Сменаи худкор («Омадам» бе ҷадвал) дар «ҷадвал» ҳисоб намешавад
    if (!s.isAdHoc && s.startsAt <= now) {
      planned++;
      if (s.checkInAt) attended++;
      else if (state === 'ABSENT') absent++;
    }
    if (late > 0) {
      lateCount++;
      lateMinutes += late;
    }
    if (s.checkInAt) {
      days.add(localDay(s.checkInAt));
      const end = s.checkOutAt ?? new Date(Math.min(now.getTime(), s.endsAt.getTime()));
      hours += Math.max(0, (end.getTime() - s.checkInAt.getTime()) / 3600000);
    }
  }
  const suggestedPay = planned > 0 ? Math.round((salary * attended) / planned) : salary;
  return { planned, attended, workedDays: days.size, hours: r1(hours), lateCount, lateMinutes, absent, suggestedPay };
}

/**
 * Маош аз рӯи давомот: маоши моҳона, сменаҳо, соатҳо, дер омадан ва наомадан.
 * Шеф — ҳамаи филиалҳо (ё як филиал), менеҷер — филиали худ. Маблағ пешниҳод аст: шеф онро тафтиш карда медиҳад.
 */
@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async month(user: AuthUser, q: { month?: string; branchId?: number }): Promise<Payroll> {
    const { key, from, to } = monthRange(q.month);
    const branchId = scopeBranch(user, q.branchId);
    const where: Prisma.UserWhereInput = {
      organizationId: user.organizationId,
      isActive: true,
      role: user.role === 'CHEF' ? { not: 'CHEF' } : { in: ['STAFF', 'MANAGER'] },
      ...(branchId ? { branchId } : { branchId: { in: user.branchIds } }),
    };
    const people = await this.prisma.user.findMany({
      where,
      include: { branch: { select: { name: true } }, shifts: { where: { startsAt: { gte: from, lt: to } } } },
      orderBy: [{ branchId: 'asc' }, { role: 'asc' }, { fullName: 'asc' }],
    });
    const now = new Date();
    const rows: PayrollRow[] = people.map((p) => {
      const salary = Number(p.salary ?? 0);
      return {
        userId: p.id,
        fullName: p.fullName,
        role: p.role,
        position: p.position,
        branchName: p.branch?.name ?? null,
        salary,
        payDay: p.payDay,
        ...summarize(salary, p.shifts, now),
      };
    });
    const sum = (k: 'salary' | 'suggestedPay' | 'hours' | 'lateCount' | 'absent') => r1(rows.reduce((s, r) => s + r[k], 0));
    return { month: key, rows, totals: { salary: sum('salary'), suggestedPay: sum('suggestedPay'), hours: sum('hours'), lateCount: sum('lateCount'), absent: sum('absent') } };
  }

  /** Давомоти худи корманд дар моҳ (профил) */
  async mine(user: AuthUser, month?: string) {
    const { key, from, to } = monthRange(month);
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { shifts: { where: { startsAt: { gte: from, lt: to } } } } });
    return { month: key, salary: Number(me.salary ?? 0), ...summarize(Number(me.salary ?? 0), me.shifts) };
  }

  async export(user: AuthUser, q: { month?: string; branchId?: number }) {
    const p = await this.month(user, q);
    const headers = ['Корманд', 'Вазифа', 'Филиал', 'Маош', 'Смена (ҷадвал)', 'Омад', 'Наомад', 'Рӯзҳои кор', 'Соат', 'Дер (бор)', 'Дер (дақ)', 'Маош аз рӯи давомот'];
    const data = p.rows.map((r) => [
      r.fullName,
      r.position ? POSITION_LABELS[r.position] : ROLE_LABELS[r.role],
      r.branchName ?? '',
      r.salary,
      r.planned,
      r.attended,
      r.absent,
      r.workedDays,
      r.hours,
      r.lateCount,
      r.lateMinutes,
      r.suggestedPay,
    ]);
    return { file: xlsx(`Маош ${p.month}`, headers, data, [24, 14, 20, 10, 12, 8, 9, 10, 8, 9, 9, 16]), month: p.month };
  }
}

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  @Roles('CHEF', 'MANAGER')
  @Feature('staff')
  month(@CurrentUser() user: AuthUser, @Query('month') month?: string, @Query('branchId') branchId?: string) {
    return this.payroll.month(user, { month, branchId: Number(branchId) || undefined });
  }

  @Get('export')
  @Roles('CHEF', 'MANAGER')
  @Feature('staff')
  async export(@CurrentUser() user: AuthUser, @Res() res: Response, @Query('month') month?: string, @Query('branchId') branchId?: string) {
    const { file, month: key } = await this.payroll.export(user, { month, branchId: Number(branchId) || undefined });
    res.setHeader('Content-Type', XLSX_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${key}.xlsx"`);
    res.end(file);
  }

  @Get('me')
  @Feature('profile')
  mine(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.payroll.mine(user, month);
  }
}

@Module({
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
