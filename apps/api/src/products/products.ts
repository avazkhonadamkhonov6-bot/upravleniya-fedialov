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
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { toProduct } from '../common/serializers';
import { AuditService } from '../core/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export class CreateProductDto {
  @IsString() @MinLength(2, { message: 'Номи маҳсулот кӯтоҳ аст' })
  name: string;

  @IsString() @MinLength(2)
  category: string;

  @IsOptional() @IsString()
  emoji?: string;

  @Type(() => Number) @IsNumber() @Min(0, { message: 'Нарх манфӣ буда наметавонад' })
  price: number;

  @Type(() => Number) @IsNumber() @Min(0, { message: 'Арзиши аслӣ манфӣ буда наметавонад' })
  cost: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2)
  name?: string;

  @IsOptional() @IsString() @MinLength(2)
  category?: string;

  @IsOptional() @IsString()
  emoji?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  price?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  cost?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser) {
    const products = await this.prisma.product.findMany({
      where: user.role === 'CHEF' ? undefined : { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    // Кормандон арзиши аслӣ ва фоидаро намебинанд.
    return products.map((p) => toProduct(p, user.role === 'STAFF'));
  }

  async create(user: AuthUser, dto: CreateProductDto) {
    const p = await this.prisma.product.create({ data: { ...dto, emoji: dto.emoji || '🍗' } });
    this.audit.log(user, 'CREATE', 'product', p.id, `Маҳсулоти нав: ${p.emoji} ${p.name} — ${Number(p.price)} сомонӣ`);
    return toProduct(p);
  }

  async update(user: AuthUser, id: number, dto: UpdateProductDto) {
    const before = await this.ensure(id);
    const p = await this.prisma.product.update({ where: { id }, data: dto });
    const changes = [
      dto.price !== undefined && Number(before.price) !== dto.price && `нарх: ${Number(before.price)} → ${dto.price}`,
      dto.cost !== undefined && Number(before.cost) !== dto.cost && `арзиши аслӣ: ${Number(before.cost)} → ${dto.cost}`,
      dto.isActive === false && before.isActive && 'аз меню пинҳон шуд',
      dto.isActive === true && !before.isActive && 'ба меню баргашт',
    ].filter(Boolean);
    this.audit.log(user, 'UPDATE', 'product', id, `${p.emoji} ${p.name}: ${changes.length ? changes.join(', ') : 'маълумот тағйир ёфт'}`);
    return toProduct(p);
  }

  async remove(user: AuthUser, id: number) {
    const before = await this.ensure(id);
    this.audit.log(user, 'DELETE', 'product', id, `Маҳсулот аз меню хориҷ шуд: ${before.emoji} ${before.name}`);
    const used = await this.prisma.orderItem.count({ where: { productId: id } });
    if (used > 0) {
      // Дар таърихи фурӯш ҳаст — танҳо аз меню пинҳон мекунем.
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { ok: true, archived: true };
    }
    await this.prisma.product.delete({ where: { id } });
    return { ok: true, archived: false };
  }

  private async ensure(id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Маҳсулот ёфт нашуд');
    return p;
  }
}

@Controller('products')
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
}

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
