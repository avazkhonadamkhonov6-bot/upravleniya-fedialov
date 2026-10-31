import {
  Body,
  ConflictException,
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
import { IsDateString, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { canSell, SEGMENTS, type Customer as CustomerDto, type CustomerStats, type Paginated, type Segment } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { branchWhere, scopeBranch } from '../common/access';
import { localDay, startOfLocalDay, startOfLocalMonth } from '../common/time';
import { AuditService } from '../core/audit.service';
import { Prisma, type Branch, type Customer } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SLEEP_DAYS = 30;
const VIP_SPENT = 1500;
const VIP_VISITS = 15;
const REGULAR_VISITS = 3;

/** Рақамро ба шакли ягона меорад: «90 123 45 67» → «+992901234567» */
export function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.length === 9) d = '992' + d;
  return '+' + d;
}

function sleepCutoff() {
  return new Date(Date.now() - SLEEP_DAYS * 86400000);
}

export function segmentOf(c: Pick<Customer, 'visits' | 'totalSpent' | 'lastVisitAt'>): Segment {
  if (c.lastVisitAt && c.lastVisitAt < sleepCutoff()) return 'SLEEPING';
  if (Number(c.totalSpent) >= VIP_SPENT || c.visits >= VIP_VISITS) return 'VIP';
  if (c.visits >= REGULAR_VISITS) return 'REGULAR';
  return 'NEW';
}

function segmentWhere(s: Segment): Prisma.CustomerWhereInput {
  const cutoff = sleepCutoff();
  const awake: Prisma.CustomerWhereInput = { OR: [{ lastVisitAt: null }, { lastVisitAt: { gte: cutoff } }] };
  const vip: Prisma.CustomerWhereInput = { OR: [{ totalSpent: { gte: VIP_SPENT } }, { visits: { gte: VIP_VISITS } }] };
  switch (s) {
    case 'SLEEPING':
      return { lastVisitAt: { lt: cutoff } };
    case 'VIP':
      return { AND: [awake, vip] };
    case 'REGULAR':
      return { AND: [awake, { NOT: vip }, { visits: { gte: REGULAR_VISITS } }] };
    case 'NEW':
      return { AND: [awake, { NOT: vip }, { visits: { lt: REGULAR_VISITS } }] };
  }
}

export function toCustomer(c: Customer & { branch?: Pick<Branch, 'name'> | null }): CustomerDto {
  const totalSpent = Number(c.totalSpent);
  return {
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    birthday: c.birthday?.toISOString() ?? null,
    branchId: c.branchId,
    branchName: c.branch?.name ?? null,
    points: c.points,
    totalSpent,
    visits: c.visits,
    avgCheck: c.visits ? Math.round((totalSpent / c.visits) * 100) / 100 : 0,
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    note: c.note,
    segment: segmentOf(c),
    debt: Number(c.debt),
    debtDueAt: c.debtDueAt ? localDay(c.debtDueAt) : null,
    createdAt: c.createdAt.toISOString(),
  };
}

export class CreateCustomerDto {
  @IsString() @MinLength(2, { message: 'Номи мизоҷро нависед' }) @MaxLength(80)
  fullName: string;

  @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' })
  phone: string;

  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email?: string;

  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString()
  birthday?: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  fullName?: string;

  @IsOptional() @IsString() @MinLength(7)
  phone?: string;

  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail()
  email?: string;

  @IsOptional() @ValidateIf((_, v) => v !== '') @IsDateString()
  birthday?: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthUser,
    q: { branchId?: number; search?: string; segment?: Segment; sort?: string; page: number; pageSize: number },
  ): Promise<Paginated<CustomerDto>> {
    const and: Prisma.CustomerWhereInput[] = [this.scope(user, q.branchId)];
    if (q.segment) and.push(segmentWhere(q.segment));
    if (q.search?.trim()) {
      const t = q.search.trim();
      const digits = t.replace(/\D/g, '');
      and.push({
        OR: [
          { fullName: { contains: t, mode: 'insensitive' } },
          { email: { contains: t, mode: 'insensitive' } },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      });
    }
    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      q.sort === 'recent'
        ? { lastVisitAt: { sort: 'desc', nulls: 'last' } }
        : q.sort === 'points'
          ? { points: 'desc' }
          : q.sort === 'new'
            ? { createdAt: 'desc' }
            : { totalSpent: 'desc' };
    const where = { AND: and };
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { branch: { select: { name: true } } },
        orderBy: [orderBy, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: rows.map(toCustomer), total, page: q.page, pageSize: q.pageSize };
  }

  async stats(user: AuthUser, branchId?: number): Promise<CustomerStats> {
    const b = this.scope(user, branchId);
    const counts = await Promise.all(SEGMENTS.map((s) => this.prisma.customer.count({ where: { AND: [b, segmentWhere(s)] } })));
    const [total, newThisMonth, points, withBirthday] = await Promise.all([
      this.prisma.customer.count({ where: b }),
      this.prisma.customer.count({ where: { ...b, createdAt: { gte: startOfLocalMonth() } } }),
      this.prisma.customer.aggregate({ where: b, _sum: { points: true } }),
      this.prisma.customer.findMany({
        where: { ...b, birthday: { not: null } },
        select: { id: true, fullName: true, phone: true, birthday: true },
      }),
    ]);
    // Зодрӯзҳо дар 7 рӯзи наздик (сол ба ҳисоб гирифта намешавад).
    const today = startOfLocalDay();
    const soon = withBirthday
      .map((c) => {
        const bd = c.birthday!;
        const next = new Date(Date.UTC(new Date().getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate()));
        if (next < new Date(today.getTime() - 86400000)) next.setUTCFullYear(next.getUTCFullYear() + 1);
        return { c, days: (next.getTime() - today.getTime()) / 86400000 };
      })
      .filter((x) => x.days >= -1 && x.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 8)
      .map(({ c }) => ({ id: c.id, fullName: c.fullName, phone: c.phone, birthday: c.birthday!.toISOString() }));

    return {
      total,
      bySegment: Object.fromEntries(SEGMENTS.map((s, i) => [s, counts[i]])) as Record<Segment, number>,
      newThisMonth,
      pointsOutstanding: points._sum.points ?? 0,
      birthdaysThisWeek: soon,
    };
  }

  /** Шеф бе филиал — ҳамаи мизоҷони ширкат (бе филиал ҳам); дигарон — филиали худ. */
  private scope(user: AuthUser, branchId?: number): Prisma.CustomerWhereInput {
    if (user.role === 'CHEF' && !branchId) return { organizationId: user.organizationId };
    return { organizationId: user.organizationId, branchId: branchWhere(user, branchId) };
  }

  /** Ҷустуҷӯ аз рӯи рақам дар POS — бонус дар тамоми филиалҳои ширкат кор мекунад. */
  async lookup(user: AuthUser, phone: string) {
    const c = await this.prisma.customer.findUnique({
      where: { organizationId_phone: { organizationId: user.organizationId, phone: normalizePhone(phone) } },
      include: { branch: true },
    });
    return c ? toCustomer(c) : null;
  }

  async get(user: AuthUser, id: number) {
    const c = await this.ensureAccess(user, id);
    const orders = await this.prisma.order.findMany({
      where: { customerId: id, branchId: branchWhere(user) },
      include: { branch: { select: { name: true } }, items: { include: { product: { select: { name: true, emoji: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const favorites = await this.prisma.$queryRaw<{ name: string; emoji: string; qty: number }[]>(Prisma.sql`
      SELECT p.name, p.emoji, SUM(oi.qty)::float AS qty
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "Product" p ON p.id = oi."productId"
      WHERE o."customerId" = ${id}
      GROUP BY p.id ORDER BY qty DESC LIMIT 5`);
    return {
      customer: toCustomer(c),
      favorites,
      orders: orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        branchName: o.branch.name,
        total: Number(o.total),
        discount: Number(o.discount),
        pointsEarned: o.pointsEarned,
        pointsUsed: o.pointsUsed,
        items: o.items.map((i) => `${i.product.name} × ${Number(i.qty)}`),
      })),
    };
  }

  async create(user: AuthUser, dto: CreateCustomerDto) {
    const phone = normalizePhone(dto.phone);
    if (phone.length < 11) throw new ConflictException('Рақами телефон нодуруст аст');
    if (await this.prisma.customer.findUnique({ where: { organizationId_phone: { organizationId: user.organizationId, phone } } })) {
      throw new ConflictException('Мизоҷ бо ин рақам аллакай ҳаст');
    }
    const branchId = user.role === 'CHEF' ? (scopeBranch(user, dto.branchId) ?? null) : user.branchId;
    const c = await this.prisma.customer.create({
      data: {
        fullName: dto.fullName.trim(),
        phone,
        email: dto.email?.trim() || null,
        birthday: dto.birthday ? new Date(dto.birthday) : null,
        note: dto.note ?? '',
        branchId,
        organizationId: user.organizationId,
      },
      include: { branch: true },
    });
    this.audit.log(user, 'CREATE', 'customer', c.id, `Мизоҷи нав: ${c.fullName} (${c.phone})`, branchId);
    return toCustomer(c);
  }

  async update(user: AuthUser, id: number, dto: UpdateCustomerDto) {
    await this.ensureAccess(user, id);
    const phone = dto.phone ? normalizePhone(dto.phone) : undefined;
    if (phone) {
      const other = await this.prisma.customer.findUnique({ where: { organizationId_phone: { organizationId: user.organizationId, phone } } });
      if (other && other.id !== id) throw new ConflictException('Мизоҷ бо ин рақам аллакай ҳаст');
    }
    const c = await this.prisma.customer.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        phone,
        email: dto.email === undefined ? undefined : dto.email.trim() || null,
        birthday: dto.birthday === undefined ? undefined : dto.birthday ? new Date(dto.birthday) : null,
        note: dto.note,
      },
      include: { branch: true },
    });
    this.audit.log(user, 'UPDATE', 'customer', id, `Маълумоти мизоҷ тағйир ёфт: ${c.fullName}`, c.branchId);
    return toCustomer(c);
  }

  async remove(user: AuthUser, id: number) {
    const c = await this.ensureAccess(user, id);
    await this.prisma.customer.delete({ where: { id } });
    this.audit.log(user, 'DELETE', 'customer', id, `Мизоҷ нест карда шуд: ${c.fullName}`, c.branchId);
    return { ok: true };
  }

  private async ensureAccess(user: AuthUser, id: number) {
    const c = await this.prisma.customer.findUnique({ where: { id }, include: { branch: true } });
    if (!c || c.organizationId !== user.organizationId) throw new NotFoundException('Мизоҷ ёфт нашуд');
    if (user.role !== 'CHEF' && c.branchId !== user.branchId) {
      throw new ForbiddenException('Ин мизоҷ ба филиали шумо тааллуқ надорад');
    }
    return c;
  }
}

@Controller('customers')
@Roles('CHEF', 'MANAGER')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
  ) {
    return this.customers.list(user, {
      branchId: Number(branchId) || undefined,
      search,
      segment: SEGMENTS.includes(segment as Segment) ? (segment as Segment) : undefined,
      sort,
      page: Math.max(Number(page) || 1, 1),
      pageSize: 20,
    });
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.customers.stats(user, Number(branchId) || undefined);
  }

  /** Официант ва кассир ҳам дар POS мизоҷро аз рӯи рақам меёбад ва сабт мекунад. */
  @Get('lookup')
  @Feature('pos')
  @Roles('CHEF', 'MANAGER', 'STAFF')
  lookup(@CurrentUser() user: AuthUser, @Query('phone') phone = '') {
    if (!canSell(user)) throw new ForbiddenException('Танҳо кассир');
    return this.customers.lookup(user, phone);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.customers.get(user, id);
  }

  @Post()
  @Feature('pos')
  @Roles('CHEF', 'MANAGER', 'STAFF')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    if (!canSell(user)) throw new ForbiddenException('Танҳо кассир');
    return this.customers.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('CHEF')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.customers.remove(user, id);
  }
}

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
