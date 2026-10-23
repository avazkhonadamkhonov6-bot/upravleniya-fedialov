import {
  Body,
  Controller,
  Delete,
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
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  formatMoney,
  type Expense as ExpenseDto,
  type ExpenseCategory,
  type Paginated,
  type ProfitAndLoss,
} from '@filialhub/shared';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { scopeBranch } from '../common/access';
import { startOfLocalMonth, TZ } from '../common/time';
import { AuditService } from '../core/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class CreateExpenseDto {
  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsIn(EXPENSE_CATEGORIES, { message: 'Категорияро интихоб кунед' })
  category: ExpenseCategory;

  @Type(() => Number) @IsNumber({}, { message: 'Маблағ нодуруст аст' }) @Min(0.01, { message: 'Маблағ бояд мусбат бошад' })
  amount: number;

  @IsDateString({}, { message: 'Сана нодуруст аст' })
  date: string;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsIn(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  amount?: number;

  @IsOptional() @IsDateString()
  date?: string;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

const include = {
  branch: { select: { name: true } },
  createdBy: { select: { fullName: true } },
} satisfies Prisma.ExpenseInclude;

function toExpense(e: Prisma.ExpenseGetPayload<{ include: typeof include }>): ExpenseDto {
  return {
    id: e.id,
    branchId: e.branchId,
    branchName: e.branch.name,
    category: e.category,
    amount: Number(e.amount),
    date: e.date.toISOString(),
    note: e.note,
    createdBy: e.createdBy?.fullName ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthUser,
    q: { branchId?: number; category?: ExpenseCategory; from?: string; to?: string; page: number },
  ): Promise<Paginated<ExpenseDto> & { sum: number }> {
    const where: Prisma.ExpenseWhereInput = {
      branchId: scopeBranch(user, q.branchId),
      category: q.category,
      date: { gte: q.from ? new Date(q.from) : undefined, lt: q.to ? new Date(q.to) : undefined },
    };
    const [rows, total, agg] = await Promise.all([
      this.prisma.expense.findMany({ where, include, orderBy: [{ date: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * 20, take: 20 }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    return { items: rows.map(toExpense), total, page: q.page, pageSize: 20, sum: r2(Number(agg._sum.amount ?? 0)) };
  }

  /** Ҳисоботи фоида ва зарар моҳ ба моҳ. */
  async pnl(user: AuthUser, branchId: number | undefined, months: number): Promise<ProfitAndLoss[]> {
    const b = scopeBranch(user, branchId) ?? null;
    const start = startOfLocalMonth();
    const local = new Date(start.getTime() + 5 * 3600000);
    local.setUTCMonth(local.getUTCMonth() - (months - 1));
    const from = new Date(local.getTime() - 5 * 3600000);

    const [sales, costs] = await Promise.all([
      this.prisma.$queryRaw<{ month: string; revenue: number; cost: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}), 'YYYY-MM') AS month,
               COALESCE(SUM("total"), 0)::float AS revenue, COALESCE(SUM("totalCost"), 0)::float AS cost
        FROM "Order"
        WHERE "createdAt" >= ${from} AND (${b}::int IS NULL OR "branchId" = ${b}::int)
        GROUP BY 1`),
      this.prisma.$queryRaw<{ month: string; category: ExpenseCategory; amount: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', ("date" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}), 'YYYY-MM') AS month,
               "category", COALESCE(SUM("amount"), 0)::float AS amount
        FROM "Expense"
        WHERE "date" >= ${from} AND (${b}::int IS NULL OR "branchId" = ${b}::int)
        GROUP BY 1, 2`),
    ]);

    const result: ProfitAndLoss[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + i, 1));
      const month = d.toISOString().slice(0, 7);
      const s = sales.find((x) => x.month === month);
      const byCategory = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;
      for (const c of costs.filter((x) => x.month === month)) byCategory[c.category] = r2(c.amount);
      const revenue = s?.revenue ?? 0;
      const cost = s?.cost ?? 0;
      const expenses = Object.values(byCategory).reduce((a, n) => a + n, 0);
      result.push({
        month,
        revenue: r2(revenue),
        cost: r2(cost),
        grossProfit: r2(revenue - cost),
        expenses: r2(expenses),
        netProfit: r2(revenue - cost - expenses),
        byCategory,
      });
    }
    return result;
  }

  async create(user: AuthUser, dto: CreateExpenseDto) {
    const branchId = scopeBranch(user, dto.branchId);
    if (!branchId) throw new NotFoundException('Филиалро интихоб кунед');
    const e = await this.prisma.expense.create({
      data: { branchId, category: dto.category, amount: dto.amount, date: new Date(dto.date), note: dto.note?.trim() ?? '', createdById: user.id },
      include,
    });
    this.audit.log(user, 'CREATE', 'expense', e.id, `Хароҷот: ${EXPENSE_LABELS[e.category]} — ${formatMoney(Number(e.amount))} (${e.branch.name})`, branchId);
    return toExpense(e);
  }

  async update(user: AuthUser, id: number, dto: UpdateExpenseDto) {
    await this.ensure(user, id);
    const e = await this.prisma.expense.update({
      where: { id },
      data: { category: dto.category, amount: dto.amount, date: dto.date ? new Date(dto.date) : undefined, note: dto.note?.trim() },
      include,
    });
    this.audit.log(user, 'UPDATE', 'expense', id, `Хароҷот тағйир ёфт: ${EXPENSE_LABELS[e.category]} — ${formatMoney(Number(e.amount))}`, e.branchId);
    return toExpense(e);
  }

  async remove(user: AuthUser, id: number) {
    const e = await this.ensure(user, id);
    await this.prisma.expense.delete({ where: { id } });
    this.audit.log(user, 'DELETE', 'expense', id, `Хароҷот нест шуд: ${EXPENSE_LABELS[e.category]} — ${formatMoney(Number(e.amount))}`, e.branchId);
    return { ok: true };
  }

  private async ensure(user: AuthUser, id: number) {
    const e = await this.prisma.expense.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Хароҷот ёфт нашуд');
    scopeBranch(user, e.branchId);
    return e;
  }
}

@Controller('expenses')
@Roles('CHEF', 'MANAGER')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    return this.expenses.list(user, {
      branchId: Number(branchId) || undefined,
      category: EXPENSE_CATEGORIES.includes(category as ExpenseCategory) ? (category as ExpenseCategory) : undefined,
      from: from || undefined,
      to: to || undefined,
      page: Math.max(Number(page) || 1, 1),
    });
  }

  @Get('pnl')
  pnl(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('months') months?: string) {
    return this.expenses.pnl(user, Number(branchId) || undefined, Math.min(Math.max(Number(months) || 6, 1), 24));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.expenses.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.remove(user, id);
  }
}

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
