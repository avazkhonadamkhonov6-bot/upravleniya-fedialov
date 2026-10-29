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
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import type { Request, Response } from 'express';
import { DEFAULT_PRODUCT_EMOJI, defaultUnit, type BusinessType } from '@filialhub/shared';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, Feature, Public, Roles } from '../auth/decorators';
import { toProduct } from '../common/serializers';
import { AuditService } from '../core/audit.service';
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
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser) {
    const products = await this.prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: user.role === 'CHEF' ? undefined : true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    // Кормандон арзиши аслӣ ва фоидаро намебинанд.
    return products.map((p) => toProduct(p, user.role === 'STAFF'));
  }

  async create(user: AuthUser, dto: CreateProductDto) {
    const type = user.businessType as BusinessType;
    const p = await this.prisma.product.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        emoji: dto.emoji || DEFAULT_PRODUCT_EMOJI[type] || '📦',
        unit: dto.unit?.trim() || defaultUnit(type),
        barcode: dto.barcode?.trim() || null,
      },
    });
    this.audit.log(user, 'CREATE', 'product', p.id, `Маҳсулоти нав: ${p.name} — ${Number(p.price)} сомонӣ`);
    return toProduct(p);
  }

  async update(user: AuthUser, id: number, dto: UpdateProductDto) {
    const before = await this.ensure(user, id);
    const p = await this.prisma.product.update({
      where: { id },
      data: { ...dto, ...(dto.barcode !== undefined ? { barcode: dto.barcode.trim() || null } : {}) },
    });
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

  /** Қабули мол (add) ё ҳисоби дастӣ (set). Шеф, менеҷер ва анбордор */
  async adjustStock(user: AuthUser, id: number, dto: StockDto) {
    if (user.role === 'STAFF' && user.position !== 'STOREKEEPER') throw new ForbiddenException('Танҳо шеф, менеҷер ё анбордор');
    const p = await this.ensure(user, id);
    if (dto.set === undefined && !dto.add) throw new BadRequestException('Миқдорро нависед');
    const updated = await this.prisma.product.update({
      where: { id },
      data: { stock: dto.set !== undefined ? dto.set : { increment: dto.add! } },
    });
    // Агар мол аввал ҳисоб намешуд, «increment» дар null кор намекунад — аз 0 сар мекунем
    const fixed = updated.stock === null && dto.add ? await this.prisma.product.update({ where: { id }, data: { stock: dto.add } }) : updated;
    const before = p.stock === null ? '—' : Number(p.stock);
    this.audit.log(user, 'UPDATE', 'product', id, `${p.name}: боқимонда ${before} → ${Number(fixed.stock)} ${p.unit}`);
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
