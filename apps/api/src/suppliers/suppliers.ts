import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Injectable, Module, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { formatMoney, type Supplier as SupplierDto, type SupplierDetail } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { AuditService } from '../core/audit.service';
import type { Prisma, Supplier } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
const r2 = (n: number) => Math.round(n * 100) / 100;

export class CreateSupplierDto {
  @IsString() @MinLength(2, { message: 'Номи таъминкунандаро нависед' }) @MaxLength(80)
  name: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

export class UpdateSupplierDto {
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

export class SupplierMoneyDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01, { message: 'Маблағро нависед' }) @Max(100_000_000)
  amount: number;

  /** Танҳо барои пардохт */
  @IsOptional() @IsIn(['CASH', 'CARD'])
  payment?: 'CASH' | 'CARD';

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

/**
 * Таъминкунандагон ва қарзи мо ба онҳо. Харид дар «Қабули мол» бо номи таъминкунанда сабт мешавад;
 * агар «ба қарз» бошад — қарз меафзояд, пардохт онро кам мекунад. Шеф ва менеҷер.
 */
@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser): Promise<SupplierDto[]> {
    const [rows, sums] = await Promise.all([
      this.prisma.supplier.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ debt: 'desc' }, { name: 'asc' }] }),
      this.purchases(user.organizationId),
    ]);
    return rows.map((s) => this.toDto(s, sums.get(s.name)));
  }

  async get(user: AuthUser, id: number): Promise<SupplierDetail> {
    const s = await this.mine(user, id);
    const [entries, moves, sums] = await Promise.all([
      this.prisma.supplierEntry.findMany({ where: { supplierId: id }, orderBy: { id: 'desc' }, take: 100, include: { user: { select: { fullName: true } } } }),
      this.prisma.stockMove.findMany({
        where: { organizationId: user.organizationId, reason: 'PURCHASE', supplier: s.name },
        orderBy: { id: 'desc' },
        take: 100,
        include: { product: { select: { name: true, unit: true } }, branch: { select: { name: true } } },
      }),
      this.purchases(user.organizationId, s.name),
    ]);
    return {
      supplier: this.toDto(s, sums.get(s.name)),
      entries: entries.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        payment: e.payment,
        note: e.note,
        userName: e.user?.fullName ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      purchases: moves.map((m) => ({
        id: m.id,
        productName: m.product.name,
        unit: m.product.unit,
        qty: Number(m.qty),
        unitCost: m.unitCost === null ? null : Number(m.unitCost),
        branchName: m.branch.name,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async create(user: AuthUser, dto: CreateSupplierDto) {
    const name = dto.name.trim();
    const exists = await this.prisma.supplier.findUnique({ where: { organizationId_name: { organizationId: user.organizationId, name } } });
    if (exists) throw new ConflictException('Чунин таъминкунанда аллакай ҳаст');
    const s = await this.prisma.supplier.create({ data: { organizationId: user.organizationId, name, phone: dto.phone?.trim() ?? '', note: dto.note?.trim() ?? '' } });
    this.audit.log(user, 'CREATE', 'supplier', s.id, `Таъминкунандаи нав: ${name}`);
    return this.toDto(s);
  }

  async update(user: AuthUser, id: number, dto: UpdateSupplierDto) {
    await this.mine(user, id);
    const s = await this.prisma.supplier.update({ where: { id }, data: { phone: dto.phone?.trim(), note: dto.note?.trim() } });
    return this.toDto(s);
  }

  /** Мо ба таъминкунанда пул додем — қарз кам мешавад (на зиёда аз қарз) */
  async pay(user: AuthUser, id: number, dto: SupplierMoneyDto) {
    const s = await this.mine(user, id);
    const debt = Number(s.debt);
    if (debt <= 0) throw new BadRequestException('Мо ба ин таъминкунанда қарз надорем');
    const amount = r2(Math.min(dto.amount, debt));
    await this.prisma.$transaction(async (tx) => {
      // Шарт дар худи SQL: ду пардохти ҳамзамон қарзро манфӣ карда наметавонанд
      const { count } = await tx.supplier.updateMany({ where: { id, debt: { gte: amount } }, data: { debt: { decrement: amount } } });
      if (!count) throw new BadRequestException('Қарз аллакай тағйир ёфт — саҳифаро нав кунед');
      await tx.supplierEntry.create({
        data: { organizationId: user.organizationId, supplierId: id, amount: -amount, payment: dto.payment ?? 'CASH', note: dto.note?.trim() ?? '', userId: user.id },
      });
    });
    this.audit.log(user, 'UPDATE', 'supplier', id, `Пардохт ба ${s.name}: ${formatMoney(amount)}`);
    return this.get(user, id);
  }

  /** Қарзи дастӣ (масалан қарзи кӯҳна аз дафтари коғазӣ) */
  async addDebt(user: AuthUser, id: number, dto: SupplierMoneyDto) {
    const s = await this.mine(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.supplierEntry.create({ data: { organizationId: user.organizationId, supplierId: id, amount: r2(dto.amount), note: dto.note?.trim() ?? '', userId: user.id } });
      await tx.supplier.update({ where: { id }, data: { debt: { increment: r2(dto.amount) } } });
    });
    this.audit.log(user, 'UPDATE', 'supplier', id, `Қарз ба ${s.name}: +${formatMoney(dto.amount)}`);
    return this.get(user, id);
  }

  /**
   * Аз «Қабули мол»: таъминкунанда худкор ба рӯйхат меояд; харид ба қарз — қарзи мо меафзояд.
   * Дар ҳамон транзаксияи анбор ё баъд аз он даъват мешавад.
   */
  async recordPurchase(db: Tx | PrismaService, p: { organizationId: number; name: string; amount: number; onCredit: boolean; userId: number; note: string }) {
    const name = p.name.trim();
    if (!name) return;
    const s = await db.supplier.upsert({
      where: { organizationId_name: { organizationId: p.organizationId, name } },
      create: { organizationId: p.organizationId, name },
      update: {},
    });
    if (!p.onCredit || !(p.amount > 0)) return;
    const amount = r2(p.amount);
    await db.supplierEntry.create({ data: { organizationId: p.organizationId, supplierId: s.id, amount, note: p.note, userId: p.userId } });
    await db.supplier.update({ where: { id: s.id }, data: { debt: { increment: amount } } });
  }

  private async mine(user: AuthUser, id: number) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s || s.organizationId !== user.organizationId) throw new NotFoundException('Таъминкунанда ёфт нашуд');
    return s;
  }

  /** Ҷамъи харидҳо аз таърихи анбор: { номи таъминкунанда: { маблағ, охирин сана } } */
  private async purchases(organizationId: number, name?: string) {
    const rows = await this.prisma.stockMove.groupBy({
      by: ['supplier'],
      where: { organizationId, reason: 'PURCHASE', supplier: name ?? { not: '' } },
      _max: { createdAt: true },
    });
    const sums = await this.prisma.$queryRaw<{ supplier: string; total: number }[]>`
      SELECT "supplier", COALESCE(SUM("qty" * COALESCE("unitCost", 0)), 0)::float AS total
      FROM "StockMove"
      WHERE "organizationId" = ${organizationId} AND "reason" = 'PURCHASE' AND "supplier" <> ''
      GROUP BY 1`;
    return new Map(rows.map((r) => [r.supplier, { total: sums.find((s) => s.supplier === r.supplier)?.total ?? 0, last: r._max.createdAt }]));
  }

  private toDto(s: Supplier, sum?: { total: number; last: Date | null }): SupplierDto {
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      note: s.note,
      debt: Number(s.debt),
      purchased: r2(sum?.total ?? 0),
      lastPurchaseAt: sum?.last?.toISOString() ?? null,
    };
  }
}

@Controller('suppliers')
@Feature('products')
@Roles('CHEF', 'MANAGER')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.suppliers.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.suppliers.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(user, id, dto);
  }

  @Post(':id/pay')
  @HttpCode(200)
  pay(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SupplierMoneyDto) {
    return this.suppliers.pay(user, id, dto);
  }

  @Post(':id/debt')
  @HttpCode(200)
  addDebt(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SupplierMoneyDto) {
    return this.suppliers.addDebt(user, id, dto);
  }
}

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
