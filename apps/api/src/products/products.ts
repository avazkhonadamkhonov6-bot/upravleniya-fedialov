import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import type { Request, Response } from 'express';
import { DEFAULT_PRODUCT_EMOJI, defaultUnit, type BusinessType, type ReorderItem, type StockMove as StockMoveDto } from '@filialhub/shared';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, Feature, Public, Roles } from '../auth/decorators';
import { toProduct } from '../common/serializers';
import { AuditService } from '../core/audit.service';
import { scopeBranch } from '../common/access';
import { StockService } from './stock';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

export class CreateProductDto {
  @IsString() @MinLength(2, { message: 'Номи маҳсулот кӯтоҳ аст' })
  name: string;

  @IsString() @MinLength(2)
  category: string;

  @IsOptional() @IsString()
  emoji?: string;

  @IsOptional() @IsString() @MaxLength(20)
  unit?: string;

  @Type(() => Number) @IsNumber() @Min(0, { message: 'Нарх манфӣ буда наметавонад' })
  price: number;

  @Type(() => Number) @IsNumber() @Min(0, { message: 'Арзиши аслӣ манфӣ буда наметавонад' })
  cost: number;

  @IsOptional() @IsString() @MaxLength(64)
  barcode?: string;

  /** Боқимонда; null — ҳисоб карда намешавад */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  stock?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  lowStock?: number | null;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2)
  name?: string;

  @IsOptional() @IsString() @MinLength(2)
  category?: string;

  @IsOptional() @IsString()
  emoji?: string;

  @IsOptional() @IsString() @MaxLength(20)
  unit?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  price?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  cost?: number;

  @IsOptional() @IsString() @MaxLength(64)
  barcode?: string;

  /** Боқимонда; null — ҳисоб карда намешавад */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  stock?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  lowStock?: number | null;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

/** Қабули мол ба анбор (add) ё ҳисоби дастӣ (set) */
export class StockDto {
  @IsOptional() @Type(() => Number) @IsNumber()
  add?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  set?: number;

  /** Филиал (шеф интихоб мекунад; менеҷер ва анбордор — филиали худ) */
  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  /** Харид: аз кӣ (таъминкунанда) */
  @IsOptional() @IsString() @MaxLength(80)
  supplier?: string;

  /** Харид: нархи як воҳид */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  unitCost?: number;

  /** Нархи харидро ҳамчун арзиши аслии мол гузоштан (фоида аз нав ҳисоб мешавад) */
  @IsOptional() @IsBoolean()
  updateCost?: boolean;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
  ) {}

  /** Филиали аввали фаъол — боқимондаи аввал ба он меравад */
  private async firstBranch(organizationId: number) {
    const b = await this.prisma.branch.findFirst({ where: { organizationId }, orderBy: [{ isActive: 'desc' }, { id: 'asc' }], select: { id: true } });
    return b?.id ?? null;
  }

  async list(user: AuthUser) {
    const products = await this.prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: user.role === 'CHEF' ? undefined : true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { branchStocks: true },
    });
    // Кормандон арзиши аслӣ ва фоидаро намебинанд.
    return products.map((p) => toProduct(p, user.role === 'STAFF'));
  }

  async create(user: AuthUser, dto: CreateProductDto) {
    const type = user.businessType as BusinessType;
    const { stock, ...rest } = dto;
    const created = await this.prisma.product.create({
      data: {
        ...rest,
        organizationId: user.organizationId,
        emoji: dto.emoji || DEFAULT_PRODUCT_EMOJI[type] || '📦',
        unit: dto.unit?.trim() || defaultUnit(type),
        barcode: dto.barcode?.trim() || null,
        stock: stock === undefined || stock === null ? null : 0,
      },
    });
    this.audit.log(user, 'CREATE', 'product', created.id, `Маҳсулоти нав: ${created.name} — ${Number(created.price)} сомонӣ`);
    // Боқимондаи аввал ба филиали аввал (баъд дар «Қабули мол» байни филиалҳо тақсим мешавад)
    const branchId = stock ? await this.firstBranch(user.organizationId) : null;
    const p = branchId ? await this.stock.adjust(created.id, branchId, { set: stock! }, { userId: user.id, note: 'Ҳисоби аввал' }) : created;
    return toProduct(p);
  }

  async update(user: AuthUser, id: number, dto: UpdateProductDto) {
    const before = await this.ensure(user, id);
    const { stock, ...rest } = dto;
    // Миқдор дар ин ҷо танҳо ҳисобро фаъол/хомӯш мекунад; миқдорҳо — дар «Қабули мол» барои ҳар филиал
    let tracking = {};
    if (stock === null && before.stock !== null) {
      await this.prisma.branchStock.deleteMany({ where: { productId: id } });
      tracking = { stock: null };
    } else if (typeof stock === 'number' && before.stock === null) {
      tracking = { stock: 0 };
    }
    let p = await this.prisma.product.update({
      where: { id },
      data: { ...rest, ...tracking, ...(dto.barcode !== undefined ? { barcode: dto.barcode.trim() || null } : {}) },
      include: { branchStocks: true },
    });
    if (typeof stock === 'number' && stock > 0 && before.stock === null) {
      const branchId = await this.firstBranch(user.organizationId);
      if (branchId) p = await this.stock.adjust(id, branchId, { set: stock }, { userId: user.id });
    }
    const changes = [
      dto.price !== undefined && Number(before.price) !== dto.price && `нарх: ${Number(before.price)} → ${dto.price}`,
      dto.cost !== undefined && Number(before.cost) !== dto.cost && `арзиши аслӣ: ${Number(before.cost)} → ${dto.cost}`,
      dto.isActive === false && before.isActive && 'пинҳон шуд',
      dto.isActive === true && !before.isActive && 'баргашт',
    ].filter(Boolean);
    this.audit.log(user, 'UPDATE', 'product', id, `${p.name}: ${changes.length ? changes.join(', ') : 'маълумот тағйир ёфт'}`);
    return toProduct(p);
  }

  async remove(user: AuthUser, id: number) {
    const before = await this.ensure(user, id);
    this.audit.log(user, 'DELETE', 'product', id, `Маҳсулот хориҷ шуд: ${before.name}`);
    const used = await this.prisma.orderItem.count({ where: { productId: id } });
    if (used > 0) {
      // Дар таърихи фурӯш ҳаст — танҳо аз меню пинҳон мекунем.
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { ok: true, archived: true };
    }
    await this.prisma.product.delete({ where: { id } });
    return { ok: true, archived: false };
  }

  /** Акси мол: браузер онро ба WebP-и хурд табдил медиҳад; дар ин ҷо танҳо навъ ва андоза месанҷем */
  async setImage(user: AuthUser, id: number, body: Buffer, contentType: string) {
    const p = await this.ensure(user, id);
    const mime = contentType.split(';')[0].trim();
    if (!IMAGE_TYPES.includes(mime)) throw new BadRequestException('Танҳо акс (JPEG, PNG, WebP)');
    if (!Buffer.isBuffer(body) || !body.byteLength) throw new BadRequestException('Акс холӣ аст');
    if (body.byteLength > MAX_IMAGE_BYTES) throw new BadRequestException('Акс хеле калон аст (то 1,5 МБ)');
    const data = new Uint8Array(body);
    const updated = await this.prisma.$transaction(async (tx) => {
      const media = await tx.media.create({ data: { ownerId: user.id, mime, size: data.byteLength, data } });
      const next = await tx.product.update({ where: { id }, data: { imageId: media.id } });
      // Акси кӯҳна дигар ба кор намеравад — ҷойро дар база озод мекунем
      if (p.imageId) await tx.media.deleteMany({ where: { id: p.imageId, messages: { none: {} } } });
      return next;
    });
    this.audit.log(user, 'UPDATE', 'product', id, `${p.name}: акс иваз шуд`);
    return toProduct(updated);
  }

  async removeImage(user: AuthUser, id: number) {
    const p = await this.ensure(user, id);
    const updated = await this.prisma.product.update({ where: { id }, data: { imageId: null } });
    if (p.imageId) await this.prisma.media.deleteMany({ where: { id: p.imageId, messages: { none: {} } } });
    return toProduct(updated);
  }

  /** Таърихи анбори мол: шеф — ҳамаи филиалҳо, дигарон — филиали худ */
  async moves(user: AuthUser, id: number, branchId?: number): Promise<StockMoveDto[]> {
    if (user.role === 'STAFF' && user.position !== 'STOREKEEPER') throw new ForbiddenException('Танҳо шеф, менеҷер ё анбордор');
    await this.ensure(user, id);
    const b = scopeBranch(user, branchId);
    const rows = await this.prisma.stockMove.findMany({
      where: { productId: id, branchId: b ?? { in: user.branchIds } },
      include: { user: { select: { fullName: true } }, branch: { select: { name: true } } },
      orderBy: { id: 'desc' },
      take: 100,
    });
    return rows.map((m) => ({
      id: m.id,
      branchName: m.branch.name,
      qty: Number(m.qty),
      balance: Number(m.balance),
      reason: m.reason as StockMoveDto['reason'],
      supplier: m.supplier,
      unitCost: m.unitCost === null ? null : Number(m.unitCost),
      orderId: m.orderId,
      note: m.note,
      userName: m.user?.fullName ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * Рӯйхати харид: молҳои ҳисобшаванда, ки дар филиал ба ҳадди «кам монд» (ё 0) расиданд.
   * Миқдори пешниҳодшуда — то 2 × ҳад; таъминкунанда ва нарх — аз охирин харид.
   */
  async reorder(user: AuthUser, branchId?: number): Promise<ReorderItem[]> {
    if (user.role === 'STAFF' && user.position !== 'STOREKEEPER') throw new ForbiddenException('Танҳо шеф, менеҷер ё анбордор');
    const b = scopeBranch(user, branchId);
    const rows = await this.prisma.branchStock.findMany({
      where: { branchId: b ?? { in: user.branchIds }, product: { organizationId: user.organizationId, isActive: true, stock: { not: null } } },
      include: { product: true, branch: { select: { name: true, isActive: true } } },
    });
    const low = rows.filter((r) => r.branch.isActive && Number(r.qty) <= (r.product.lowStock === null ? 0 : Number(r.product.lowStock)));
    const last = await this.prisma.stockMove.findMany({
      where: { organizationId: user.organizationId, reason: 'PURCHASE', productId: { in: low.map((r) => r.productId) } },
      orderBy: { id: 'desc' },
      distinct: ['productId'],
      select: { productId: true, supplier: true, unitCost: true },
    });
    return low
      .map((r) => {
        const limit = r.product.lowStock === null ? 0 : Number(r.product.lowStock);
        const qty = Number(r.qty);
        const l = last.find((x) => x.productId === r.productId);
        return {
          productId: r.productId,
          name: r.product.name,
          emoji: r.product.emoji,
          unit: r.product.unit,
          branchId: r.branchId,
          branchName: r.branch.name,
          qty,
          lowStock: limit,
          suggested: Math.max(Math.ceil(limit * 2 - qty), 1),
          lastSupplier: l?.supplier || null,
          lastUnitCost: l?.unitCost == null ? null : Number(l.unitCost),
        };
      })
      .sort((a, b) => a.qty - a.lowStock - (b.qty - b.lowStock) || a.name.localeCompare(b.name));
  }

  async suppliers(user: AuthUser): Promise<string[]> {
    const rows = await this.prisma.stockMove.findMany({
      where: { organizationId: user.organizationId, reason: 'PURCHASE', supplier: { not: '' } },
      distinct: ['supplier'],
      select: { supplier: true },
      orderBy: { supplier: 'asc' },
      take: 200,
    });
    return rows.map((r) => r.supplier);
  }

  /** Қабули мол (add) ё ҳисоби дастӣ (set). Шеф, менеҷер ва анбордор */
  async adjustStock(user: AuthUser, id: number, dto: StockDto) {
    if (user.role === 'STAFF' && user.position !== 'STOREKEEPER') throw new ForbiddenException('Танҳо шеф, менеҷер ё анбордор');
    const p = await this.ensure(user, id);
    if (dto.set === undefined && !dto.add) throw new BadRequestException('Миқдорро нависед');
    const branchId = scopeBranch(user, dto.branchId) ?? (await this.firstBranch(user.organizationId));
    if (!branchId) throw new BadRequestException('Филиалро интихоб кунед');
    const before = await this.prisma.branchStock.findUnique({ where: { productId_branchId: { productId: id, branchId } } });
    const fixed = await this.stock.adjust(id, branchId, dto.set !== undefined ? { set: dto.set } : { add: dto.add }, {
      userId: user.id,
      supplier: dto.supplier,
      unitCost: dto.unitCost ?? null,
      note: dto.note,
    });
    // Нархи нави харид → арзиши аслӣ (фақат шеф ва менеҷер; анбордор нархро иваз намекунад)
    if (dto.updateCost && dto.unitCost !== undefined && dto.add && dto.add > 0 && user.role !== 'STAFF') {
      await this.prisma.product.update({ where: { id }, data: { cost: dto.unitCost } });
      fixed.cost = new Prisma.Decimal(dto.unitCost);
    }
    const now = fixed.branchStocks.find((b) => b.branchId === branchId);
    this.audit.log(user, 'UPDATE', 'product', id, `${p.name}: анбори филиал ${before ? Number(before.qty) : 0} → ${Number(now?.qty ?? 0)} ${p.unit}`, branchId);
    return toProduct(fixed, user.role === 'STAFF');
  }

  /** Акс барои ҳама (бозори онлайн): танҳо файлҳое, ки акси ягон мол ҳастанд */
  async image(id: number) {
    const m = await this.prisma.media.findFirst({ where: { id, products: { some: {} } } });
    if (!m) throw new NotFoundException('Акс ёфт нашуд');
    return m;
  }

  private async ensure(user: AuthUser, id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p || p.organizationId !== user.organizationId) throw new NotFoundException('Маҳсулот ёфт нашуд');
    return p;
  }
}

@Controller('products')
@Feature('products', 'pos')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.products.list(user);
  }

  /** Рӯйхати харид: моли кам монда */
  @Get('reorder')
  reorder(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.products.reorder(user, Number(branchId) || undefined);
  }

  /** Номҳои таъминкунандагон (барои пешниҳод ҳангоми харид) */
  @Get('suppliers')
  suppliers(@CurrentUser() user: AuthUser) {
    return this.products.suppliers(user);
  }

  @Get(':id/moves')
  moves(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query('branchId') branchId?: string) {
    return this.products.moves(user, id, Number(branchId) || undefined);
  }

  @Post()
  @Roles('CHEF')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @Patch(':id')
  @Roles('CHEF')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.products.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('CHEF')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.products.remove(user, id);
  }

  /** PUT /products/5/image, бадан — худи акс (Content-Type: image/webp…) */
  @Put(':id/image')
  @Roles('CHEF')
  setImage(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.products.setImage(user, id, req.body as Buffer, req.headers['content-type'] ?? '');
  }

  @Delete(':id/image')
  @Roles('CHEF')
  removeImage(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.products.removeImage(user, id);
  }

  @Post(':id/stock')
  @HttpCode(200)
  stock(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: StockDto) {
    return this.products.adjustStock(user, id, dto);
  }
}

/** GET /api/images/7 — акси мол барои бозори онлайн ва Google (бе воридшавӣ, кеш як сол) */
@Controller('images')
export class ImagesController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get(':id')
  async image(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const m = await this.products.image(id);
    res.setHeader('Content-Type', m.mime);
    res.setHeader('Content-Length', String(m.size));
    // Акси нав ID-и нав мегирад — ҳамин файл ҳеҷ гоҳ иваз намешавад
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(Buffer.from(m.data));
  }
}

@Module({
  controllers: [ProductsController, ImagesController],
  providers: [ProductsService],
})
export class ProductsModule {}
