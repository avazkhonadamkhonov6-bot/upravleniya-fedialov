import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Injectable, Module, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { formatMoney, type DebtRequest as DebtRequestDto } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { AlertsService } from '../core/alerts.service';
import { AuditService } from '../core/audit.service';
import { EventsService } from '../core/events';
import { Prisma } from '../generated/prisma/client';
import { CreateOrderDto, OrdersModule, OrdersService } from '../orders/orders';
import { PrismaService } from '../prisma/prisma.service';
import { DebtsModule, DebtsService, requestScope } from './debts';

export class CreateDebtRequestDto {
  @Type(() => Number) @IsInt()
  customerId: number;

  @Type(() => Number) @IsNumber() @Min(0.01, { message: 'Маблағро нависед' })
  amount: number;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

export class DecideDebtRequestDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision: 'APPROVE' | 'REJECT';
}

const include = {
  customer: { select: { fullName: true, phone: true, debt: true } },
  branch: { select: { name: true } },
  requestedBy: { select: { fullName: true } },
  decidedBy: { select: { fullName: true } },
} satisfies Prisma.DebtRequestInclude;

type Row = Prisma.DebtRequestGetPayload<{ include: typeof include }>;

function toRequest(r: Row): DebtRequestDto {
  const sale = r.sale as { lines?: { name: string; qty: number }[] } | null;
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customer.fullName,
    customerPhone: r.customer.phone,
    customerDebt: Number(r.customer.debt),
    branchName: r.branch.name,
    amount: Number(r.amount),
    note: r.note,
    items: sale?.lines ?? null,
    status: r.status,
    requestedBy: r.requestedBy?.fullName ?? null,
    decidedBy: r.decidedBy?.fullName ?? null,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    orderId: r.orderId,
  };
}

/**
 * Дархости қарз: кассир қарзро худаш дода наметавонад. Ӯ дархост мефиристад (қарзи дастӣ ё фурӯш ба қарз аз POS),
 * менеҷери филиал (ё шеф) тасдиқ мекунад — танҳо он гоҳ қарз сабт мешавад ва фурӯш анҷом меёбад.
 */
@Injectable()
export class DebtRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debts: DebtsService,
    private readonly orders: OrdersService,
    private readonly alerts: AlertsService,
    private readonly events: EventsService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, status?: string): Promise<DebtRequestDto[]> {
    const rows = await this.prisma.debtRequest.findMany({
      where: { ...requestScope(user), status: status === 'PENDING' ? 'PENDING' : undefined },
      include,
      orderBy: { id: 'desc' },
      take: 100,
    });
    return rows.map(toRequest);
  }

  /** Қарзи дастӣ аз кассир */
  async create(user: AuthUser, dto: CreateDebtRequestDto) {
    const c = await this.debts.customer(user, dto.customerId);
    const branchId = user.branchId ?? c.branchId;
    if (!branchId) throw new BadRequestException('Филиали мизоҷ маълум нест');
    return this.save(user, { branchId, customerId: c.id, amount: Math.round(dto.amount * 100) / 100, note: dto.note?.trim() ?? '', sale: null });
  }

  /** Фурӯш ба қарз аз POS: сабад нигоҳ дошта мешавад, мол пас аз тасдиқ дода мешавад */
  async createSale(user: AuthUser, dto: CreateOrderDto) {
    if (dto.payment !== 'DEBT' || !dto.customerId) throw new BadRequestException('Барои фурӯш ба қарз мизоҷро интихоб кунед');
    // Санҷиши пурра (филиал, мол, мизоҷ, промо, бонус) — ҳамон тавре ки фурӯши воқеӣ ҳисоб мешавад
    const q = await this.orders.quote(user, dto);
    await this.debts.customer(user, dto.customerId);
    const products = await this.prisma.product.findMany({ where: { id: { in: q.lines.map((l) => l.productId) } }, select: { id: true, name: true } });
    const lines = q.lines.map((l) => ({ name: products.find((p) => p.id === l.productId)?.name ?? '?', qty: l.qty }));
    const sale = { ...dto, branchId: q.branchId, clientRef: undefined, soldAt: undefined, lines };
    return this.save(user, { branchId: q.branchId, customerId: dto.customerId, amount: q.total, note: '', sale });
  }

  async decide(user: AuthUser, id: number, decision: 'APPROVE' | 'REJECT'): Promise<DebtRequestDto> {
    if (user.role === 'STAFF') throw new ForbiddenException('Дархости қарзро танҳо менеҷер ё шеф тасдиқ мекунад');
    const r = await this.prisma.debtRequest.findFirst({ where: { id, ...requestScope(user) } });
    if (!r) throw new NotFoundException('Дархост ёфт нашуд');
    if (r.status !== 'PENDING') throw new BadRequestException('Ин дархост аллакай баррасӣ шудааст');

    // Аввал «мегирем» — то ду менеҷер як дархостро ду бор тасдиқ накунанд
    const claimed = await this.prisma.debtRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedById: user.id, decidedAt: new Date() },
    });
    if (!claimed.count) throw new BadRequestException('Ин дархост аллакай баррасӣ шудааст');

    let orderId: number | null = null;
    if (decision === 'APPROVE') {
      try {
        if (r.sale) {
          const { lines: _lines, ...sale } = r.sale as unknown as CreateOrderDto & { lines: unknown };
          const order = await this.orders.create(user, { ...sale, clientRef: `debt-request-${r.id}` }, { sellerId: r.requestedById ?? undefined, approved: true });
          orderId = order.id;
        } else {
          await this.debts.add(user, r.customerId, { amount: Number(r.amount), note: r.note });
        }
      } catch (e) {
        // Сабт нашуд (масалан мол аз фурӯш баромад) — дархост боз интизор мемонад
        await this.prisma.debtRequest.update({ where: { id }, data: { status: 'PENDING', decidedById: null, decidedAt: null } });
        throw e;
      }
    }

    const updated = await this.prisma.debtRequest.update({ where: { id }, data: { orderId }, include });
    const ok = decision === 'APPROVE';
    this.audit.log(user, 'UPDATE', 'debtRequest', id, `${ok ? 'Қарз тасдиқ шуд' : 'Қарз рад шуд'}: ${updated.customer.fullName} — ${formatMoney(Number(r.amount))}`, r.branchId);
    if (r.requestedById) {
      this.alerts.notify(r.requestedById, {
        icon: ok ? '✅' : '⛔',
        title: ok ? `Қарз тасдиқ шуд: ${updated.customer.fullName}` : `Қарз рад шуд: ${updated.customer.fullName}`,
        body: `${formatMoney(Number(r.amount))} · ${user.fullName}${ok && r.sale ? ' · молро диҳед' : ''}`,
        link: '/debts',
      });
    }
    this.events.emitOrg(user.organizationId, 'debts');
    return toRequest(updated);
  }

  private async save(user: AuthUser, d: { branchId: number; customerId: number; amount: number; note: string; sale: object | null }) {
    // Як дархости кушода барои мизоҷ кифоя — такрори тасодуфӣ (ду бор пахш кардан) нашавад
    const open = await this.prisma.debtRequest.findFirst({ where: { customerId: d.customerId, requestedById: user.id, status: 'PENDING', amount: d.amount } });
    if (open) throw new BadRequestException('Ин дархост аллакай фиристода шудааст — интизори тасдиқи менеҷер бошед');
    const r = await this.prisma.debtRequest.create({
      data: {
        organizationId: user.organizationId,
        branchId: d.branchId,
        customerId: d.customerId,
        amount: d.amount,
        note: d.note,
        sale: d.sale ?? Prisma.DbNull,
        requestedById: user.id,
      },
      include,
    });
    this.audit.log(user, 'CREATE', 'debtRequest', r.id, `Дархости қарз: ${r.customer.fullName} — ${formatMoney(d.amount)}`, d.branchId);
    void this.alerts.notifyBranch(
      d.branchId,
      { icon: '📝', title: `Дархости қарз: ${r.customer.fullName}`, body: `${formatMoney(d.amount)} · ${user.fullName}`, link: '/debts' },
      { includeChefs: true, exceptUserId: user.id },
    );
    this.events.emitOrg(user.organizationId, 'debts');
    return toRequest(r);
  }
}

@Controller('debt-requests')
@Feature('debts')
export class DebtRequestsController {
  constructor(private readonly requests: DebtRequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.requests.list(user, status);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDebtRequestDto) {
    return this.requests.create(user, dto);
  }

  @Post('sale')
  @Feature('pos')
  createSale(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.requests.createSale(user, dto);
  }

  @Post(':id/decide')
  @HttpCode(200)
  decide(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: DecideDebtRequestDto) {
    return this.requests.decide(user, id, dto.decision);
  }
}

@Module({
  imports: [DebtsModule, OrdersModule],
  controllers: [DebtRequestsController],
  providers: [DebtRequestsService],
})
export class DebtRequestsModule {}
