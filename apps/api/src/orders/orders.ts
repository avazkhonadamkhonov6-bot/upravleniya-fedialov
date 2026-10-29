import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsIn, IsInt, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { canSell, PAYMENT_LABELS, PAYMENTS, POINTS_RATE, type Order, type Paginated, type Payment } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { branchWhere, scopeBranch } from '../common/access';
import { localDateTime, XLSX_TYPE, xlsx } from '../common/xlsx';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../products/stock';

class OrderItemDto {
  @Type(() => Number) @IsInt()
  productId: number;

  /** Касрӣ ҳам мешавад (1,5 кг); то 3 рақам пас аз вергул */
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001, { message: 'Миқдор нодуруст аст' }) @Max(100000)
  qty: number;
}

export class CreateOrderDto {
  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsIn(PAYMENTS)
  payment: Payment;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1, { message: 'Ақаллан як маҳсулот интихоб кунед' })
  items: OrderItemDto[];

  @IsOptional() @Type(() => Number) @IsInt()
  customerId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  usePoints?: number;
}

const include = {
  branch: { select: { name: true } },
  user: { select: { fullName: true } },
  customer: { select: { fullName: true } },
  items: { include: { product: { select: { name: true, emoji: true, unit: true } } } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

function toOrder(o: OrderRow): Order {
  const total = Number(o.total);
  const totalCost = Number(o.totalCost);
  return {
    id: o.id,
    branchId: o.branchId,
    branchName: o.branch.name,
    userName: o.user?.fullName ?? '—',
    createdAt: o.createdAt.toISOString(),
    total,
    totalCost,
    profit: Math.round((total - totalCost) * 100) / 100,
    payment: o.payment,
    customerId: o.customerId,
    customerName: o.customer?.fullName ?? null,
    discount: Number(o.discount),
    pointsEarned: o.pointsEarned,
    pointsUsed: o.pointsUsed,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      emoji: i.product.emoji,
      unit: i.product.unit,
      qty: Number(i.qty),
      unitPrice: Number(i.unitPrice),
      unitCost: Number(i.unitCost),
    })),
  };
}

/** Кормандон арзиши аслӣ ва фоидаро намебинанд. */
function forViewer(user: AuthUser, o: Order): Order {
  if (user.role !== 'STAFF') return o;
  return { ...o, totalCost: 0, profit: 0, items: o.items.map((i) => ({ ...i, unitCost: 0 })) };
}

/** Фурӯш метавонад шеф, менеҷер ва кассир сабт кунад. */
function assertCanSell(user: AuthUser) {
  if (!canSell(user)) {
    throw new ForbiddenException('Танҳо кассир фурӯш сабт карда метавонад');
  }
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(
    user: AuthUser,
    q: { branchId?: number; from?: string; to?: string; page: number; pageSize: number },
  ): Promise<Paginated<Order>> {
    assertCanSell(user);
    const where = this.where(user, q);
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    const items = rows.map((o) => forViewer(user, toOrder(o)));
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  private where(user: AuthUser, q: { branchId?: number; from?: string; to?: string }): Prisma.OrderWhereInput {
    return {
      branchId: branchWhere(user, q.branchId),
      // Кассир танҳо фармоишҳои худашро мебинад.
      userId: user.role === 'STAFF' ? user.id : undefined,
      createdAt: {
        gte: q.from ? new Date(q.from) : undefined,
        lt: q.to ? new Date(q.to) : undefined,
      },
    };
  }

  /** Фурӯш ба Excel (то 20 000 сатр); кормандон арзиш ва фоидаро намебинанд */
  async export(user: AuthUser, q: { branchId?: number; from?: string; to?: string }) {
    assertCanSell(user);
    const rows = await this.prisma.order.findMany({ where: this.where(user, q), include, orderBy: { createdAt: 'desc' }, take: 20_000 });
    const staff = user.role === 'STAFF';
    const headers = ['№', 'Сана', 'Филиал', 'Кассир', 'Мизоҷ', 'Пардохт', 'Маҳсулот', 'Тахфиф', 'Маблағ', ...(staff ? [] : ['Арзиши аслӣ', 'Фоида'])];
    const data = rows.map((r) => {
      const o = toOrder(r);
      const items = o.items.map((i) => `${i.name} × ${i.qty}`).join(', ');
      return [o.id, localDateTime(r.createdAt), o.branchName, o.userName, o.customerName ?? '', PAYMENT_LABELS[o.payment], items, o.discount || null, o.total, ...(staff ? [] : [o.totalCost, o.profit])];
    });
    return xlsx('Фурӯш', headers, data, [8, 17, 20, 20, 20, 10, 50, 10, 12, 12, 12]);
  }

  async create(user: AuthUser, dto: CreateOrderDto) {
    assertCanSell(user);
    const branchId = scopeBranch(user, dto.branchId);
    if (!branchId) throw new BadRequestException('Филиалро интихоб кунед');
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch?.isActive) throw new BadRequestException('Филиал ғайрифаъол аст');

    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: ids }, isActive: true, organizationId: user.organizationId } });
    if (products.length !== ids.length) throw new BadRequestException('Баъзе маҳсулот дар рӯйхат нест');

    // Нарх ва арзиш аз база гирифта мешаванд, на аз клиент.
    const lines = dto.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      return { productId: p.id, qty: i.qty, unitPrice: p.price, unitCost: p.cost };
    });
    const subtotal = lines.reduce((s, l) => s + Number(l.unitPrice) * l.qty, 0);
    const totalCost = lines.reduce((s, l) => s + Number(l.unitCost) * l.qty, 0);

    // Бонус: баллҳо ҳамчун тахфиф (1 балл = 1 сомонӣ), аз маблағи пардохтшуда 5% бармегардад.
    let pointsUsed = 0;
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || customer.organizationId !== user.organizationId) throw new BadRequestException('Мизоҷ ёфт нашуд');
      pointsUsed = Math.min(dto.usePoints ?? 0, customer.points, Math.floor(subtotal));
    } else if (dto.usePoints) {
      throw new BadRequestException('Барои истифодаи бонус мизоҷро интихоб кунед');
    }
    const total = Math.round((subtotal - pointsUsed) * 100) / 100;
    const pointsEarned = dto.customerId ? Math.floor(total * POINTS_RATE) : 0;

    let low: Awaited<ReturnType<StockService['take']>> = [];
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          branchId,
          userId: user.id,
          payment: dto.payment,
          total,
          totalCost,
          discount: pointsUsed,
          customerId: dto.customerId ?? null,
          pointsUsed,
          pointsEarned,
          items: { create: lines },
        },
        include,
      });
      if (dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            points: { increment: pointsEarned - pointsUsed },
            totalSpent: { increment: total },
            visits: { increment: 1 },
            lastVisitAt: created.createdAt,
          },
        });
      }
      low = await this.stock.take(tx, lines);
      return created;
    });
    if (low.length) void this.stock.warn(branchId, low);
    return forViewer(user, toOrder(order));
  }
}

@Controller('orders')
@Feature('pos', 'sales')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.orders.list(user, {
      branchId: Number(branchId) || undefined,
      from: from || undefined,
      to: to || undefined,
      page: Math.max(Number(page) || 1, 1),
      pageSize: Math.min(Math.max(Number(pageSize) || 20, 1), 100),
    });
  }

  /** GET /orders/export?from=…&to=… → .xlsx */
  @Get('export')
  async export(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const file = await this.orders.export(user, { branchId: Number(branchId) || undefined, from: from || undefined, to: to || undefined });
    res.setHeader('Content-Type', XLSX_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.end(file);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
