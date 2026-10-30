import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
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
import { ArrayMinSize, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import {
  BUSINESS_TYPES,
  ONLINE_NEXT,
  ONLINE_PAYMENTS,
  ONLINE_STATUS_LABELS,
  ONLINE_STATUSES,
  type BusinessType,
  type OnlineOrder,
  type OnlineOrderStatus,
  type Payment,
  type StoreDetail,
  type StoreSummary,
  type StoreVisits,
} from '@filialhub/shared';
import { AuthClient, AuthUser, ClientOnly, CurrentClient, CurrentUser, Feature, Public, Roles } from '../auth/decorators';
import { localDay } from '../common/time';
import { branchWhere } from '../common/access';
import { toClient } from '../common/serializers';
import { AlertsService } from '../core/alerts.service';
import { AuditService } from '../core/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../products/stock';
import { EventsService } from '../core/events';

// ---------- DTO ----------

class CartItemDto {
  @Type(() => Number) @IsInt()
  productId: number;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001, { message: 'Миқдор нодуруст аст' }) @Max(100000)
  qty: number;
}

export class PlaceOrderDto {
  @Type(() => Number) @IsInt()
  storeId: number;

  /** Филиале, ки фармоишро иҷро мекунад (холӣ — филиали аввалини фаъол) */
  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsString() @MinLength(3, { message: 'Суроғаро нависед' }) @MaxLength(200)
  address: string;

  @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' }) @MaxLength(32)
  phone: string;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;

  /** Нақд ё корт — пул ҳангоми гирифтани мол дода мешавад */
  @IsIn(ONLINE_PAYMENTS, { message: 'Тарзи пардохтро интихоб кунед' })
  payment: Payment;

  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  @ArrayMinSize(1, { message: 'Сабад холӣ аст' })
  items: CartItemDto[];
}

/** Фармоиш аз миз тавассути QR (бе воридшавӣ) */
export class TableOrderDto {
  @Type(() => Number) @IsInt()
  storeId: number;

  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsString() @MinLength(1) @MaxLength(10, { message: 'Рақами миз нодуруст аст' })
  table: string;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  @ArrayMinSize(1, { message: 'Сабад холӣ аст' })
  items: CartItemDto[];
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(3, { message: 'Ному насабро пурра нависед' }) @MaxLength(80)
  fullName?: string;

  @IsOptional() @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' }) @MaxLength(32)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(200)
  address?: string;
}

export class SetStatusDto {
  @IsIn(ONLINE_STATUSES)
  status: OnlineOrderStatus;
}

export class ReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating: number;

  @IsOptional() @IsString() @MaxLength(500, { message: 'Шарҳ хеле дароз аст' })
  text?: string;
}

// ---------- Service ----------

const orderInclude = {
  organization: { select: { id: true, name: true, type: true } },
  branch: { select: { id: true, name: true } },
  client: { select: { id: true, fullName: true, phone: true } },
  items: true,
  review: { select: { rating: true, text: true } },
} satisfies Prisma.OnlineOrderInclude;

type OrderRow = Prisma.OnlineOrderGetPayload<{ include: typeof orderInclude }>;

function toOnline(o: OrderRow): OnlineOrder {
  return {
    id: o.id,
    status: o.status,
    payment: o.payment,
    store: { id: o.organization.id, name: o.organization.name, type: o.organization.type as BusinessType },
    branch: o.branch,
    client: o.client,
    address: o.address,
    phone: o.phone,
    note: o.note,
    total: Number(o.total),
    items: o.items.map((i) => ({ productId: i.productId, name: i.name, emoji: i.emoji, unit: i.unit, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
    table: o.table,
    review: o.review,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
    private readonly events: EventsService,
  ) {}

  /** Вақти охирин фармоишҳои миз барои ҳар филиал (ҳимоя аз спам) */
  private tableHits = new Map<number, number[]>();
  private viewHits = new Map<number, { at: number; n: number }>();

  /** Мағозаҳои кушода: бизнес ҷамъиятӣ, ақаллан як филиали фаъол ва як маҳсулот */
  async stores(type?: string): Promise<StoreSummary[]> {
    const orgs = await this.prisma.organization.findMany({
      where: {
        isPublic: true,
        status: 'APPROVED',
        type: BUSINESS_TYPES.includes(type as BusinessType) ? type : undefined,
        branches: { some: { isActive: true } },
        products: { some: { isActive: true } },
      },
      include: {
        branches: { where: { isActive: true }, select: { city: true } },
        products: { where: { isActive: true }, select: { emoji: true }, take: 40 },
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { id: 'asc' },
    });
    const ratings = await this.ratings(orgs.map((o) => o.id));
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type as BusinessType,
      description: o.description,
      products: o._count.products,
      branches: o.branches.length,
      cities: [...new Set(o.branches.map((b) => b.city))],
      preview: [...new Set(o.products.map((p) => p.emoji))].slice(0, 4),
      ...(ratings.get(o.id) ?? { rating: null, reviewCount: 0 }),
    }));
  }

  /** Баҳои миёна барои якчанд мағоза бо як дархост */
  private async ratings(orgIds: number[]) {
    const rows = await this.prisma.review.groupBy({ by: ['organizationId'], where: { organizationId: { in: orgIds } }, _avg: { rating: true }, _count: true });
    return new Map(rows.map((r) => [r.organizationId, { rating: Math.round((r._avg.rating ?? 0) * 10) / 10, reviewCount: r._count }]));
  }

  async store(id: number): Promise<StoreDetail> {
    const o = await this.prisma.organization.findFirst({
      where: { id, isPublic: true, status: 'APPROVED' },
      include: {
        branches: { where: { isActive: true }, orderBy: { id: 'asc' } },
        products: { where: { isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] },
      },
    });
    if (!o || !o.branches.length) throw new NotFoundException('Мағоза ёфт нашуд');
    const [rating, reviews] = await Promise.all([
      this.ratings([o.id]),
      this.prisma.review.findMany({ where: { organizationId: o.id }, orderBy: { id: 'desc' }, take: 10, include: { client: { select: { fullName: true } } } }),
    ]);
    return {
      ...(rating.get(o.id) ?? { rating: null, reviewCount: 0 }),
      reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, text: r.text, author: r.client.fullName.trim().split(/\s+/)[0] ?? '', createdAt: r.createdAt.toISOString() })),
      id: o.id,
      name: o.name,
      type: o.type as BusinessType,
      description: o.description,
      products: o.products.length,
      branches: o.branches.length,
      cities: [...new Set(o.branches.map((b) => b.city))],
      preview: [...new Set(o.products.map((p) => p.emoji))].slice(0, 4),
      branchList: o.branches.map((b) => ({ id: b.id, name: b.name, city: b.city, address: b.address, phone: b.phone })),
      // Арзиши аслӣ ба мизоҷ нишон дода намешавад
      catalog: o.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        emoji: p.emoji,
        unit: p.unit,
        price: Number(p.price),
        imageId: p.imageId,
        soldOut: p.stock !== null && Number(p.stock) <= 0,
      })),
    };
  }

  async me(client: AuthClient) {
    return toClient(await this.prisma.client.findUniqueOrThrow({ where: { id: client.id } }));
  }

  async updateMe(client: AuthClient, dto: UpdateClientDto) {
    const c = await this.prisma.client.update({
      where: { id: client.id },
      data: { fullName: dto.fullName?.trim(), phone: dto.phone?.trim(), address: dto.address?.trim() },
    });
    return toClient(c);
  }

  /** Санҷиши мағоза, филиал ва мол; нарх аз база. Барои фармоиши онлайн ва фармоиши миз */
  private async prepare(dto: { storeId: number; branchId?: number; items: CartItemDto[] }) {
    const store = await this.prisma.organization.findFirst({
      where: { id: dto.storeId, isPublic: true, status: 'APPROVED' },
      include: { branches: { where: { isActive: true }, orderBy: { id: 'asc' } } },
    });
    if (!store || !store.branches.length) throw new BadRequestException('Мағоза ҳоло фармоиш қабул намекунад');
    const branch = dto.branchId ? store.branches.find((b) => b.id === dto.branchId) : store.branches[0];
    if (!branch) throw new BadRequestException('Филиал ёфт нашуд');

    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: ids }, organizationId: store.id, isActive: true } });
    if (products.length !== ids.length) throw new BadRequestException('Баъзе маҳсулот дигар фурӯхта намешаванд — сабадро нав кунед');
    const out = products.find((p) => p.stock !== null && Number(p.stock) <= 0);
    if (out) throw new BadRequestException(`«${out.name}» тамом шудааст — онро аз сабад гиред`);

    // Нарх аз база, на аз браузер
    const items = dto.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      return { productId: p.id, name: p.name, emoji: p.emoji, unit: p.unit, qty: i.qty, unitPrice: p.price };
    });
    const total = r2(items.reduce((s, i) => s + Number(i.unitPrice) * i.qty, 0));
    return { store, branch, items, total };
  }

  async placeOrder(client: AuthClient, dto: PlaceOrderDto) {
    const { store, branch, items, total } = await this.prepare(dto);
    const order = await this.prisma.onlineOrder.create({
      data: {
        clientId: client.id,
        organizationId: store.id,
        branchId: branch.id,
        address: dto.address.trim(),
        phone: dto.phone.trim(),
        note: dto.note?.trim() ?? '',
        payment: dto.payment,
        total,
        items: { create: items },
      },
      include: orderInclude,
    });
    void this.alerts.notifyBranch(
      branch.id,
      { icon: '🛍️', title: `Фармоиши онлайн #${order.id}`, body: `${client.fullName} · ${total} сомонӣ · ${dto.payment === 'CARD' ? 'корт' : 'нақд'}`, link: '/online' },
      { includeChefs: true },
    );
    this.events.emitOrg(store.id, 'orders');
    return toOnline(order);
  }

  /**
   * Фармоиш аз миз (QR дар тарабхона): бе сабти ном. Ошпаз ва официант онро фавран мебинанд.
   * Ҳимоя аз спам: на зиёда аз 20 фармоиш дар як дақиқа барои як филиал.
   */
  async tableOrder(dto: TableOrderDto) {
    const { store, branch, items, total } = await this.prepare(dto);
    if (store.type !== 'RESTAURANT') throw new BadRequestException('Фармоиш аз миз танҳо дар тарабхона');
    const now = Date.now();
    const recent = (this.tableHits.get(branch.id) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= 20) throw new HttpException('Дархостҳо аз ҳад зиёданд. Каме истед ва аз нав кӯшиш кунед.', HttpStatus.TOO_MANY_REQUESTS);
    this.tableHits.set(branch.id, [...recent, now]);

    const table = dto.table.trim();
    const order = await this.prisma.onlineOrder.create({
      data: {
        organizationId: store.id,
        branchId: branch.id,
        table,
        address: `Мизи ${table}`,
        phone: '',
        note: dto.note?.trim() ?? '',
        payment: 'CASH',
        total,
        items: { create: items },
      },
      include: orderInclude,
    });
    void this.alerts.notifyBranch(
      branch.id,
      { icon: '🍽️', title: `Мизи ${table}: фармоиши нав #${order.id}`, body: `${items.length} хӯрок · ${total} сомонӣ`, link: '/online' },
      { includeChefs: true },
    );
    this.events.emitOrg(store.id, 'orders');
    return toOnline(order);
  }

  async clientOrders(client: AuthClient) {
    const rows = await this.prisma.onlineOrder.findMany({ where: { clientId: client.id }, include: orderInclude, orderBy: { id: 'desc' }, take: 100 });
    return rows.map(toOnline);
  }

  /** Мизоҷ фармоиши навро (ҳанӯз қабул нашуда) бекор карда метавонад */
  async cancelByClient(client: AuthClient, id: number) {
    const o = await this.prisma.onlineOrder.findUnique({ where: { id } });
    if (!o || o.clientId !== client.id) throw new NotFoundException('Фармоиш ёфт нашуд');
    if (o.status !== 'NEW') throw new BadRequestException('Фармоиш аллакай қабул шудааст — бо мағоза тамос гиред');
    return toOnline(await this.prisma.onlineOrder.update({ where: { id }, data: { status: 'CANCELLED' }, include: orderInclude }));
  }

  /** Баҳо пас аз «Расонида шуд»; такрор — баҳо иваз мешавад */
  async review(client: AuthClient, id: number, dto: ReviewDto) {
    const o = await this.prisma.onlineOrder.findUnique({ where: { id }, include: { review: true } });
    if (!o || o.clientId !== client.id) throw new NotFoundException('Фармоиш ёфт нашуд');
    if (o.status !== 'DELIVERED') throw new BadRequestException('Баҳо пас аз гирифтани фармоиш дода мешавад');
    const data = { rating: dto.rating, text: dto.text?.trim() ?? '' };
    await this.prisma.review.upsert({
      where: { onlineOrderId: id },
      create: { ...data, onlineOrderId: id, clientId: client.id, organizationId: o.organizationId },
      update: data,
    });
    if (!o.review) {
      const chefs = await this.prisma.user.findMany({ where: { organizationId: o.organizationId, role: 'CHEF', isActive: true }, select: { id: true } });
      this.alerts.notify(
        chefs.map((c) => c.id),
        { icon: '⭐', title: `Баҳои нав: ${'★'.repeat(dto.rating)}`, body: data.text.slice(0, 200) || `Фармоиш #${id}`, link: '/online' },
      );
    }
    return toOnline(await this.prisma.onlineOrder.findUniqueOrThrow({ where: { id }, include: orderInclude }));
  }

  /** Як кушодани саҳифаи мағоза (браузер дар як сессия як бор мефиристад) */
  async view(id: number) {
    // Ҳимояи оддӣ аз ҳисобкунии сунъӣ: на зиёда аз 600 дар як дақиқа барои як мағоза
    const now = Date.now();
    const hit = this.viewHits.get(id);
    if (hit && now - hit.at < 60_000 && hit.n >= 600) return;
    this.viewHits.set(id, hit && now - hit.at < 60_000 ? { at: hit.at, n: hit.n + 1 } : { at: now, n: 1 });
    const day = new Date(`${localDay(new Date())}T00:00:00Z`);
    await this.prisma.storeView
      .upsert({ where: { organizationId_day: { organizationId: id, day } }, create: { organizationId: id, day, views: 1 }, update: { views: { increment: 1 } } })
      .catch(() => {}); // мағозаи нест — бе хато
  }

  /** Статистикаи бозор барои соҳиб: кушодани саҳифа дар 30 рӯзи охир */
  async visits(user: AuthUser): Promise<StoreVisits> {
    const days = 30;
    const from = new Date(`${localDay(new Date(Date.now() - (days - 1) * 86_400_000))}T00:00:00Z`);
    const rows = await this.prisma.storeView.findMany({ where: { organizationId: user.organizationId, day: { gte: from } }, orderBy: { day: 'asc' } });
    const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.views]));
    const series = Array.from({ length: days }, (_, i) => {
      const day = new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      return { day, views: byDay.get(day) ?? 0 };
    });
    const sum = (n: number) => series.slice(-n).reduce((s, d) => s + d.views, 0);
    return { series, today: sum(1), week: sum(7), month: sum(30) };
  }

  // ---------- Тарафи ширкат ----------

  async staffList(user: AuthUser, q: { status?: OnlineOrderStatus; branchId?: number }) {
    const rows = await this.prisma.onlineOrder.findMany({
      where: {
        organizationId: user.organizationId,
        // Шеф бе филтр — ҳама; дигарон — филиали худ
        branchId: user.role === 'CHEF' && !q.branchId ? undefined : branchWhere(user, q.branchId),
        status: q.status,
      },
      include: orderInclude,
      orderBy: { id: 'desc' },
      take: 200,
    });
    return rows.map(toOnline);
  }

  async setStatus(user: AuthUser, id: number, status: OnlineOrderStatus) {
    const o = await this.prisma.onlineOrder.findUnique({ where: { id }, include: { items: true } });
    if (!o || o.organizationId !== user.organizationId) throw new NotFoundException('Фармоиш ёфт нашуд');
    if (user.role !== 'CHEF' && o.branchId !== user.branchId) throw new ForbiddenException('Ин фармоиши филиали дигар аст');
    if (!ONLINE_NEXT[o.status].includes(status)) {
      throw new BadRequestException(`Аз «${ONLINE_STATUS_LABELS[o.status]}» ба «${ONLINE_STATUS_LABELS[status]}» гузаштан мумкин нест`);
    }

    let low: Awaited<ReturnType<StockService['take']>> = [];
    const updated = await this.prisma.$transaction(async (tx) => {
      let saleOrderId = o.saleOrderId;
      // Расонида шуд → фурӯш дар филиал сабт мешавад (ба омор ва фоида медарояд)
      if (status === 'DELIVERED' && !saleOrderId && o.branchId) {
        const productIds = o.items.map((i) => i.productId).filter((x): x is number => x !== null);
        const costs = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, cost: true } });
        const lines = o.items
          .filter((i) => i.productId !== null)
          .map((i) => ({ productId: i.productId!, qty: i.qty, unitPrice: i.unitPrice, unitCost: costs.find((c) => c.id === i.productId)?.cost ?? 0 }));
        const totalCost = r2(lines.reduce((s, l) => s + Number(l.unitCost) * Number(l.qty), 0));
        const sale = await tx.order.create({
          data: { branchId: o.branchId, userId: user.id, total: o.total, totalCost, payment: o.payment, items: { create: lines } },
        });
        saleOrderId = sale.id;
        low = await this.stock.take(tx, lines.map((l) => ({ productId: l.productId, qty: Number(l.qty) })));
      }
      return tx.onlineOrder.update({ where: { id }, data: { status, saleOrderId }, include: orderInclude });
    });
    if (low.length && o.branchId) void this.stock.warn(o.branchId, low);
    this.events.emitOrg(o.organizationId, 'orders');
    this.audit.log(user, 'UPDATE', 'online-order', id, `Фармоиши онлайн #${id}: ${ONLINE_STATUS_LABELS[o.status]} → ${ONLINE_STATUS_LABELS[status]}`, o.branchId);
    return toOnline(updated);
  }
}

// ---------- Controllers ----------

/** Бозор: рӯйхати мағозаҳо ҷамъиятӣ аст; фармоиш — танҳо барои мизоҷи воридшуда */
@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Public()
  @Get('stores')
  stores(@Query('type') type?: string) {
    return this.shop.stores(type);
  }

  @Public()
  @Get('stores/:id')
  store(@Param('id', ParseIntPipe) id: number) {
    return this.shop.store(id);
  }

  @ClientOnly()
  @Get('me')
  me(@CurrentClient() client: AuthClient) {
    return this.shop.me(client);
  }

  @ClientOnly()
  @Patch('me')
  updateMe(@CurrentClient() client: AuthClient, @Body() dto: UpdateClientDto) {
    return this.shop.updateMe(client, dto);
  }

  @ClientOnly()
  @Get('orders')
  orders(@CurrentClient() client: AuthClient) {
    return this.shop.clientOrders(client);
  }

  @Public()
  @Post('stores/:id/view')
  @HttpCode(204)
  view(@Param('id', ParseIntPipe) id: number) {
    return this.shop.view(id);
  }

  @Public()
  @Post('table-orders')
  table(@Body() dto: TableOrderDto) {
    return this.shop.tableOrder(dto);
  }

  @ClientOnly()
  @Post('orders')
  place(@CurrentClient() client: AuthClient, @Body() dto: PlaceOrderDto) {
    return this.shop.placeOrder(client, dto);
  }

  @ClientOnly()
  @Post('orders/:id/review')
  @HttpCode(200)
  review(@CurrentClient() client: AuthClient, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.shop.review(client, id, dto);
  }

  @ClientOnly()
  @Post('orders/:id/cancel')
  cancel(@CurrentClient() client: AuthClient, @Param('id', ParseIntPipe) id: number) {
    return this.shop.cancelByClient(client, id);
  }
}

/** Фармоишҳои онлайн дар панели ширкат (шеф, менеҷер, кассир, фурӯшанда) */
@Controller('online-orders')
@Feature('online')
export class OnlineOrdersController {
  constructor(private readonly shop: ShopService) {}

  @Get('visits')
  @Roles('CHEF', 'MANAGER')
  visits(@CurrentUser() user: AuthUser) {
    return this.shop.visits(user);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string, @Query('branchId') branchId?: string) {
    return this.shop.staffList(user, {
      status: ONLINE_STATUSES.includes(status as OnlineOrderStatus) ? (status as OnlineOrderStatus) : undefined,
      branchId: Number(branchId) || undefined,
    });
  }

  @Patch(':id')
  setStatus(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SetStatusDto) {
    return this.shop.setStatus(user, id, dto.status);
  }
}

@Module({
  controllers: [ShopController, OnlineOrdersController],
  providers: [ShopService],
})
export class ShopModule {}
