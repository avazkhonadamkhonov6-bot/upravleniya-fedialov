import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { canSell, PAYMENT_LABELS, PAYMENTS, POINTS_RATE, type Order, type Paginated, type Payment, type ReturnResult } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { branchWhere, scopeBranch } from '../common/access';
import { localDateTime, XLSX_TYPE, xlsx } from '../common/xlsx';
import { AuditService } from '../core/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../products/stock';
import { DebtsModule, DebtsService, parseDueDate } from '../debts/debts';
import { PromosModule, PromosService } from '../promos/promos';

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

  /** Коди тахфиф (аксия) */
  @IsOptional() @IsString() @MaxLength(20)
  promoCode?: string;

  /** Рақами ягонаи фурӯш аз браузер — фурӯши офлайн ду бор сабт намешавад */
  @IsOptional() @IsString() @MaxLength(64)
  clientRef?: string;

  /** Вақти воқеии фурӯши офлайн (то 7 рӯз пеш) */
  @IsOptional() @IsDateString()
  soldAt?: string;

  /** Фурӯш ба қарз: мӯҳлати пардохт «YYYY-MM-DD» (ихтиёрӣ) */
  @IsOptional() @IsString()
  debtDueAt?: string;
}

const include = {
  branch: { select: { name: true } },
  user: { select: { fullName: true } },
  customer: { select: { fullName: true } },
  items: { include: { product: { select: { name: true, emoji: true, unit: true } } } },
  returns: { select: { total: true, items: { select: { productId: true, qty: true } } } },
} satisfies Prisma.OrderInclude;

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;

function toOrder(o: OrderRow): Order {
  const total = Number(o.total);
  const totalCost = Number(o.totalCost);
  // Аллакай баргардонида шуд: дар возвратҳо qty манфӣ аст
  const returned = new Map<number, number>();
  for (const r of o.returns) for (const i of r.items) returned.set(i.productId, r3((returned.get(i.productId) ?? 0) - Number(i.qty)));
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
    promoCode: o.promoCode,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      emoji: i.product.emoji,
      unit: i.product.unit,
      qty: Number(i.qty),
      unitPrice: Number(i.unitPrice),
      unitCost: Number(i.unitCost),
      ...(returned.has(i.productId) ? { returned: returned.get(i.productId) } : {}),
    })),
    returnOfId: o.returnOfId,
    note: o.note,
    refunded: r2(o.returns.reduce((s, r) => s - Number(r.total), 0)),
  };
}

/**
 * Ҳисоби возврат (бе база): пул мутаносибан ба он чи мизоҷ воқеан пардохт кард (пас аз тахфиф ва бонус).
 * Возврати охирин боқимондаи дақиқро медиҳад — тийинҳо аз яклухткунӣ гум намешаванд.
 */
export function planReturn(
  orig: { total: number; pointsUsed: number; pointsEarned: number; items: { productId: number; qty: number; unitPrice: number; unitCost: number }[] },
  already: { total: number; items: { productId: number; qty: number }[] }[],
  want: { productId: number; qty: number }[],
) {
  const sold = new Map<number, { qty: number; unitPrice: number; unitCost: number }>();
  for (const i of orig.items) {
    const cur = sold.get(i.productId);
    sold.set(i.productId, { qty: r3((cur?.qty ?? 0) + i.qty), unitPrice: i.unitPrice, unitCost: i.unitCost });
  }
  const back = new Map<number, number>();
  for (const r of already) for (const i of r.items) back.set(i.productId, r3((back.get(i.productId) ?? 0) - i.qty));
  const merged = new Map<number, number>();
  for (const w of want) merged.set(w.productId, r3((merged.get(w.productId) ?? 0) + w.qty));

  const lines: { productId: number; qty: number; unitPrice: number; unitCost: number }[] = [];
  for (const [productId, qty] of merged) {
    const s = sold.get(productId);
    if (!s) throw new BadRequestException('Ин мол дар чек нест');
    const left = r3(s.qty - (back.get(productId) ?? 0));
    if (!(qty > 0) || qty > left) throw new BadRequestException(left > 0 ? `Аз ин мол танҳо ${left} баргардонидан мумкин` : 'Ин мол аллакай пурра баргардонида шуд');
    lines.push({ productId, qty, unitPrice: s.unitPrice, unitCost: s.unitCost });
  }
  const subtotal = orig.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const ratio = subtotal > 0 ? orig.total / subtotal : 0;
  const refundedBefore = already.reduce((s, r) => s - r.total, 0);
  const everything = [...sold].every(([id, s]) => r3((back.get(id) ?? 0) + (merged.get(id) ?? 0)) >= s.qty);
  const refund = everything ? r2(orig.total - refundedBefore) : r2(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0) * ratio);
  const cost = r2(lines.reduce((s, l) => s + l.unitCost * l.qty, 0));
  const share = orig.total > 0 ? refund / orig.total : 0;
  return { lines, refund, cost, pointsBack: Math.round(orig.pointsUsed * share), pointsRemove: Math.round(orig.pointsEarned * share) };
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
    private readonly debts: DebtsService,
    private readonly promos: PromosService,
    private readonly audit: AuditService,
  ) {}

  /** Як чек (аз QR-и чек ё ҷустуҷӯ): шеф — ҳама, менеҷер — филиали худ, кассир — танҳо чекҳои худаш */
  async get(user: AuthUser, id: number): Promise<Order> {
    assertCanSell(user);
    const o = await this.prisma.order.findUnique({ where: { id }, include });
    if (!o || !user.branchIds.includes(o.branchId)) throw new NotFoundException('Чек ёфт нашуд');
    if (user.role !== 'CHEF' && o.branchId !== user.branchId) throw new NotFoundException('Чек ёфт нашуд');
    if (user.role === 'STAFF' && o.userId !== user.id) throw new NotFoundException('Чек ёфт нашуд');
    return forViewer(user, toOrder(o));
  }

  /**
   * Возврат (пурра ё қисман): чеки манфӣ ба фурӯши аслӣ, бинобар ин фурӯш, фоида ва Z-ҳисобот худкор соф мешаванд.
   * Мол ба анбори ҳамон филиал, бонус ва қарзи мизоҷ мутаносибан бармегарданд.
   * Танҳо шеф ва менеҷери ҳамон филиал — кассир не: возврати бе назорат роҳи осони дуздии пул аст.
   */
  async returnSale(user: AuthUser, orderId: number, dto: ReturnDto): Promise<ReturnResult> {
    if (user.role === 'STAFF') throw new ForbiddenException('Возвратро танҳо менеҷер ё шеф мекунад');
    const head = await this.prisma.order.findUnique({ where: { id: orderId }, select: { branchId: true, returnOfId: true } });
    if (!head || !user.branchIds.includes(head.branchId)) throw new NotFoundException('Фурӯш ёфт нашуд');
    scopeBranch(user, head.branchId);
    if (head.returnOfId) throw new BadRequestException('Ин чек худаш возврат аст');
    const num = (i: { productId: number; qty: Prisma.Decimal; unitPrice: Prisma.Decimal; unitCost: Prisma.Decimal }) => ({
      productId: i.productId,
      qty: Number(i.qty),
      unitPrice: Number(i.unitPrice),
      unitCost: Number(i.unitCost),
    });
    const note = dto.note?.trim() ?? '';

    let debtReduced = 0;
    let plan!: ReturnType<typeof planReturn>;
    let orig!: { id: number; branchId: number; payment: Payment; customerId: number | null };
    const created = await this.prisma.$transaction(async (tx) => {
      // Қулф: ду возврати ҳамзамон як молро ду бор баргардонида наметавонанд
      await tx.$queryRaw`SELECT 1 FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, returns: { include: { items: true } } } });
      orig = o;
      plan = planReturn(
        { total: Number(o.total), pointsUsed: o.pointsUsed, pointsEarned: o.pointsEarned, items: o.items.map(num) },
        o.returns.map((r) => ({ total: Number(r.total), items: r.items.map(num) })),
        dto.items,
      );
      const ret = await tx.order.create({
        data: {
          branchId: orig.branchId,
          userId: user.id,
          payment: orig.payment,
          total: -plan.refund,
          totalCost: -plan.cost,
          customerId: orig.customerId,
          returnOfId: orig.id,
          note,
          items: { create: plan.lines.map((l) => ({ ...l, qty: -l.qty })) },
        },
        include,
      });
      if (orig.customerId) {
        const c = await tx.customer.findUniqueOrThrow({ where: { id: orig.customerId }, select: { points: true, debt: true } });
        // Қарз: возврати фурӯш ба қарз аввал қарзро кам мекунад; зиёдатӣ — нақд ба мизоҷ
        debtReduced = orig.payment === 'DEBT' ? r2(Math.min(plan.refund, Math.max(0, Number(c.debt)))) : 0;
        if (debtReduced > 0) {
          await tx.debtEntry.create({
            data: { organizationId: user.organizationId, customerId: orig.customerId, orderId: ret.id, amount: -debtReduced, note: `Возврат №${orig.id}`, userId: user.id },
          });
        }
        const debtLeft = r2(Number(c.debt) - debtReduced);
        await tx.customer.update({
          where: { id: orig.customerId },
          data: {
            points: Math.max(0, c.points + plan.pointsBack - plan.pointsRemove),
            totalSpent: { decrement: plan.refund },
            ...(debtReduced > 0 ? { debt: { decrement: debtReduced }, ...(debtLeft <= 0 ? { debtDueAt: null } : {}) } : {}),
          },
        });
      }
      await this.stock.give(tx, orig.branchId, plan.lines, { reason: 'RETURN', orderId: ret.id, userId: user.id, note: `Возврат №${orig.id}` });
      return ret;
    });
    this.stock.changed(user.organizationId);
    this.audit.log(user, 'CREATE', 'order', created.id, `Возврат аз фурӯши №${orig.id}: ${plan.refund} сомонӣ${note ? ` (${note})` : ''}`, orig.branchId);
    return { order: forViewer(user, toOrder(created)), cashBack: r2(plan.refund - debtReduced), debtReduced };
  }

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
    // Танҳо майдонҳои ҷадвал. Рӯйхати маҳсулотро худи база ҷамъ мекунад — дар Render (0,1 CPU) 20 000 фармоиш
    // бо include-и пурра ~30 с серверро банд мекард.
    const rows = await this.prisma.order.findMany({
      where: this.where(user, q),
      select: {
        id: true, createdAt: true, total: true, totalCost: true, payment: true, discount: true, returnOfId: true, note: true,
        branch: { select: { name: true } },
        user: { select: { fullName: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20_000,
    });
    const lists = new Map<number, string>();
    if (rows.length) {
      const agg = await this.prisma.$queryRaw<{ orderId: number; list: string }[]>(Prisma.sql`
        SELECT oi."orderId", string_agg(p.name || ' × ' || (oi.qty::float8)::text, ', ' ORDER BY oi.id) AS list
        FROM "OrderItem" oi JOIN "Product" p ON p.id = oi."productId"
        WHERE oi."orderId" = ANY(${rows.map((o) => o.id)}::int[])
        GROUP BY oi."orderId"`);
      for (const a of agg) lists.set(a.orderId, a.list);
    }
    const staff = user.role === 'STAFF';
    const headers = ['№', 'Сана', 'Филиал', 'Кассир', 'Мизоҷ', 'Пардохт', 'Маҳсулот', 'Тахфиф', 'Маблағ', ...(staff ? [] : ['Арзиши аслӣ', 'Фоида'])];
    const data = rows.map((o) => {
      const total = Number(o.total);
      const totalCost = Number(o.totalCost);
      const list = lists.get(o.id) ?? '';
      const items = o.returnOfId ? `Возврат аз №${o.returnOfId}: ${list}${o.note ? ` (${o.note})` : ''}` : list;
      return [
        o.id, localDateTime(o.createdAt), o.branch.name, o.user?.fullName ?? '—', o.customer?.fullName ?? '', PAYMENT_LABELS[o.payment], items,
        Number(o.discount) || null, total, ...(staff ? [] : [totalCost, r2(total - totalCost)]),
      ];
    });
    return xlsx('Фурӯш', headers, data, [8, 17, 20, 20, 20, 10, 50, 10, 12, 12, 12]);
  }

  /** Нарх, тахфиф ва бонуси фурӯш — аз база, на аз браузер (бе тағйир додани чизе) */
  async quote(user: AuthUser, dto: CreateOrderDto) {
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

    // Аввал коди тахфиф (санҷиш; истифода дар транзаксия шуморида мешавад), баъд бонус аз маблағи боқимонда
    const promo = dto.promoCode?.trim() ? await this.promos.check(user.organizationId, dto.promoCode, subtotal, 'pos') : null;
    const afterPromo = subtotal - (promo?.discount ?? 0);

    // Бонус: баллҳо ҳамчун тахфиф (1 балл = 1 сомонӣ), аз маблағи пардохтшуда 5% бармегардад.
    let pointsUsed = 0;
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || customer.organizationId !== user.organizationId) throw new BadRequestException('Мизоҷ ёфт нашуд');
      pointsUsed = Math.min(dto.usePoints ?? 0, customer.points, Math.floor(afterPromo));
    } else if (dto.usePoints) {
      throw new BadRequestException('Барои истифодаи бонус мизоҷро интихоб кунед');
    }
    if (dto.payment === 'DEBT' && !dto.customerId) throw new BadRequestException('Барои фурӯш ба қарз мизоҷро интихоб кунед');
    const dueAt = dto.payment === 'DEBT' ? parseDueDate(dto.debtDueAt) : null;
    const total = Math.round((afterPromo - pointsUsed) * 100) / 100;
    // Вақти фурӯши офлайн: на дар оянда ва на зиёда аз 7 рӯз пеш
    const soldAtRaw = dto.soldAt ? new Date(dto.soldAt) : null;
    const soldAt = soldAtRaw && soldAtRaw.getTime() < Date.now() && Date.now() - soldAtRaw.getTime() < 7 * 86_400_000 ? soldAtRaw : null;
    const pointsEarned = dto.customerId ? Math.floor(total * POINTS_RATE) : 0;
    return { branchId, lines, subtotal, totalCost, promo, pointsUsed, total, soldAt, pointsEarned, dueAt };
  }

  /** Санҷиши пешакии боқимонда (масалан пеш аз дархости қарз) — бе кам кардани чизе */
  checkStock(branchId: number, lines: { productId: number; qty: number }[]) {
    return this.prisma.$transaction((tx) => this.stock.ensure(tx, branchId, lines));
  }

  /**
   * opts.approved — фурӯш ба қарз аз дархости кассир, ки менеҷер тасдиқ кард;
   * opts.sellerId — кассире, ки дархост фиристод (фурӯш ба номи ӯ сабт мешавад).
   */
  async create(user: AuthUser, dto: CreateOrderDto, opts: { sellerId?: number; approved?: boolean } = {}) {
    assertCanSell(user);
    // Фурӯши офлайн, ки аллакай расида буд (интернет пас аз сабт канда шуд) — ҳамонро бармегардонем
    if (dto.clientRef) {
      const existing = await this.prisma.order.findUnique({ where: { clientRef: dto.clientRef }, include });
      if (existing) {
        if (!user.branchIds.includes(existing.branchId)) throw new BadRequestException('Рақами фурӯш такрор аст');
        return forViewer(user, toOrder(existing));
      }
    }
    const { branchId, lines, subtotal, totalCost, promo, pointsUsed, total, soldAt, pointsEarned, dueAt } = await this.quote(user, dto);
    // Кассир ба қарз танҳо то лимити ширкат (Organization.cashierDebtLimit) мефурӯшад; зиёдтар — дархост ба менеҷер (DebtRequestsService)
    if (dto.payment === 'DEBT' && user.role === 'STAFF' && !opts.approved) {
      const [org, cust] = await Promise.all([
        this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { cashierDebtLimit: true } }),
        this.prisma.customer.findUniqueOrThrow({ where: { id: dto.customerId! }, select: { debt: true } }),
      ]);
      const limit = Number(org.cashierDebtLimit);
      if (!(limit > 0 && Number(cust.debt) + total <= limit)) throw new ForbiddenException('Фурӯш ба қарз бояд аз ҷониби менеҷер тасдиқ шавад');
    }

    let low: Awaited<ReturnType<StockService['take']>> = [];
    const order = await this.prisma.$transaction(async (tx) => {
      // Фурӯши офлайн (soldAt) аллакай шуда буд — мол ба мизоҷ дода шуд, онро рад намекунем
      if (!soldAt) await this.stock.ensure(tx, branchId, lines);
      if (promo) await this.promos.redeem(tx, user.organizationId, promo.code, subtotal, 'pos');
      const created = await tx.order.create({
        data: {
          branchId,
          userId: opts.sellerId ?? user.id,
          payment: dto.payment,
          total,
          totalCost,
          discount: Math.round((pointsUsed + (promo?.discount ?? 0)) * 100) / 100,
          promoCode: promo?.code ?? null,
          clientRef: dto.clientRef ?? null,
          ...(soldAt ? { createdAt: soldAt } : {}),
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
      if (dto.payment === 'DEBT' && dto.customerId) {
        await this.debts.addFromSale(tx, { organizationId: user.organizationId, customerId: dto.customerId, orderId: created.id, amount: total, userId: opts.sellerId ?? user.id, dueAt });
      }
      low = await this.stock.take(tx, branchId, lines, { reason: 'SALE', orderId: created.id, userId: opts.sellerId ?? user.id });
      return created;
    });
    this.stock.changed(user.organizationId);
    if (low.length) void this.stock.warn(branchId, low);
    if (dto.payment === 'DEBT' && dto.customerId) {
      const c = await this.prisma.customer.findUniqueOrThrow({ where: { id: dto.customerId }, select: { fullName: true, phone: true, telegramChatId: true, debt: true } });
      void this.debts.sendNewDebt(user.organizationId, { fullName: c.fullName, phone: c.phone, telegramChatId: c.telegramChatId, debt: Number(c.debt) }, total, dueAt);
    }
    return forViewer(user, toOrder(order));
  }
}

class ReturnItemDto {
  @Type(() => Number) @IsInt()
  productId: number;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001, { message: 'Миқдор нодуруст аст' }) @Max(100000)
  qty: number;
}

export class ReturnDto {
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  @ArrayMinSize(1, { message: 'Молеро, ки бармегардад, интихоб кунед' })
  items: ReturnItemDto[];

  /** Сабаб: «вайрон буд», «андоза мувофиқ наомад»… */
  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
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

  /** GET /orders/123 — як чек (QR дар чеки чопшуда ба /sales?order=123 мебарад) */
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.get(user, id);
  }

  /** POST /orders/:id/return — возврати пурра ё қисман (шеф ва менеҷер) */
  @Post(':id/return')
  returnSale(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReturnDto) {
    return this.orders.returnSale(user, id, dto);
  }
}

@Module({
  imports: [DebtsModule, PromosModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
