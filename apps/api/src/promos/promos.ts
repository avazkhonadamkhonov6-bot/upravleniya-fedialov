import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { formatMoney, type PromoCheck, type PromoCode as PromoDto } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { AuditService } from '../core/audit.service';
import type { Prisma, PromoCode } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
type Channel = 'pos' | 'online';

export class PromoDtoIn {
  @IsString() @MinLength(3, { message: 'Код аз 3 ҳарф кам набошад' }) @MaxLength(20) @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Код танҳо ҳарфҳои лотинӣ ва рақам' })
  code: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90)
  percent?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  amount?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minTotal?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  weekdays?: number[];

  @IsOptional() @IsDateString()
  startsAt?: string | null;

  @IsOptional() @IsDateString()
  endsAt?: string | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  maxUses?: number | null;

  @IsOptional() @IsBoolean()
  pos?: boolean;

  @IsOptional() @IsBoolean()
  online?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export function toPromo(p: PromoCode): PromoDto {
  return {
    id: p.id,
    code: p.code,
    percent: p.percent,
    amount: p.amount === null ? null : Number(p.amount),
    minTotal: Number(p.minTotal),
    weekdays: p.weekdays,
    startsAt: p.startsAt?.toISOString() ?? null,
    endsAt: p.endsAt?.toISOString() ?? null,
    maxUses: p.maxUses,
    uses: p.uses,
    pos: p.pos,
    online: p.online,
    isActive: p.isActive,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Рӯзи ҳафта бо вақти Душанбе: 1 = душанбе … 7 = якшанбе */
const localWeekday = (d = new Date()) => ((new Date(d.getTime() + 5 * 3600_000).getUTCDay() + 6) % 7) + 1;

/**
 * Кодҳои тахфиф: шеф месозад, кассир дар POS ва мизоҷ дар сабади онлайн ворид мекунад.
 * Тахфиф дар сервер ҳисоб мешавад; истифода дар ҳамон транзаксияи фурӯш шуморида мешавад.
 */
@Injectable()
export class PromosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.promoCode.findMany({ where: { organizationId: user.organizationId }, orderBy: { id: 'desc' } });
    return rows.map(toPromo);
  }

  async create(user: AuthUser, dto: PromoDtoIn) {
    const data = this.data(dto);
    if (await this.prisma.promoCode.findUnique({ where: { organizationId_code: { organizationId: user.organizationId, code: data.code } } })) {
      throw new ConflictException('Чунин код аллакай ҳаст');
    }
    const p = await this.prisma.promoCode.create({ data: { ...data, organizationId: user.organizationId } });
    this.audit.log(user, 'CREATE', 'promo', p.id, `Коди тахфиф: ${p.code} (${label(p)})`);
    return toPromo(p);
  }

  async update(user: AuthUser, id: number, dto: PromoDtoIn) {
    await this.mine(user, id);
    const p = await this.prisma.promoCode.update({ where: { id }, data: this.data(dto) });
    this.audit.log(user, 'UPDATE', 'promo', id, `Коди тахфиф: ${p.code} (${label(p)})`);
    return toPromo(p);
  }

  async remove(user: AuthUser, id: number) {
    const p = await this.mine(user, id);
    await this.prisma.promoCode.delete({ where: { id } });
    this.audit.log(user, 'DELETE', 'promo', id, `Коди тахфиф хориҷ шуд: ${p.code}`);
    return { ok: true };
  }

  /** Санҷиш бе истифода — барои нишон додани тахфиф дар сабад */
  async check(organizationId: number, code: string, total: number, channel: Channel): Promise<PromoCheck> {
    const p = await this.find(this.prisma, organizationId, code);
    const discount = this.validate(p, total, channel);
    return { code: p.code, discount, label: label(p) };
  }

  /** Дар транзаксияи фурӯш: тахфифро ҳисоб мекунад ва истифодаро мешуморад (ҳадди maxUses — бе пойга) */
  async redeem(tx: Tx, organizationId: number, code: string, total: number, channel: Channel) {
    const p = await this.find(tx, organizationId, code);
    const discount = this.validate(p, total, channel);
    const { count } = await tx.promoCode.updateMany({
      where: { id: p.id, ...(p.maxUses !== null ? { uses: { lt: p.maxUses } } : {}) },
      data: { uses: { increment: 1 } },
    });
    if (!count) throw new BadRequestException('Ин код дигар тамом шудааст');
    return { code: p.code, discount };
  }

  private async find(db: Tx | PrismaService, organizationId: number, code: string) {
    const p = await db.promoCode.findUnique({ where: { organizationId_code: { organizationId, code: code.trim().toUpperCase() } } });
    if (!p || !p.isActive) throw new BadRequestException('Код нодуруст аст');
    return p;
  }

  private validate(p: PromoCode, total: number, channel: Channel) {
    const now = new Date();
    if (!p[channel]) throw new BadRequestException(channel === 'pos' ? 'Ин код танҳо дар бозори онлайн' : 'Ин код танҳо дар мағоза (касса)');
    if (p.startsAt && now < p.startsAt) throw new BadRequestException('Аксия ҳанӯз сар нашудааст');
    if (p.endsAt && now > p.endsAt) throw new BadRequestException('Мӯҳлати код гузашт');
    if (p.weekdays.length && !p.weekdays.includes(localWeekday(now))) throw new BadRequestException('Ин код имрӯз кор намекунад');
    if (p.maxUses !== null && p.uses >= p.maxUses) throw new BadRequestException('Ин код дигар тамом шудааст');
    if (total < Number(p.minTotal)) throw new BadRequestException(`Код аз харид ${formatMoney(Number(p.minTotal))} кор мекунад`);
    const off = p.percent ? (total * p.percent) / 100 : Number(p.amount ?? 0);
    return r2(Math.min(off, total));
  }

  private data(dto: PromoDtoIn) {
    const percent = dto.percent ?? null;
    const amount = dto.amount ?? null;
    if ((percent === null) === (amount === null)) throw new BadRequestException('Фоиз ё маблағро нависед (яке аз ду)');
    if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) throw new BadRequestException('Санаи анҷом пеш аз сар аст');
    return {
      code: dto.code.trim().toUpperCase(),
      percent,
      amount,
      minTotal: dto.minTotal ?? 0,
      weekdays: [...new Set(dto.weekdays ?? [])].sort(),
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      maxUses: dto.maxUses ?? null,
      pos: dto.pos ?? true,
      online: dto.online ?? true,
      isActive: dto.isActive ?? true,
    };
  }

  private async mine(user: AuthUser, id: number) {
    const p = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!p || p.organizationId !== user.organizationId) throw new NotFoundException('Код ёфт нашуд');
    return p;
  }
}

const label = (p: Pick<PromoCode, 'percent' | 'amount'>) => (p.percent ? `−${p.percent}%` : `−${formatMoney(Number(p.amount ?? 0))}`);

@Controller('promos')
export class PromosController {
  constructor(private readonly promos: PromosService) {}

  @Get()
  @Feature('customers')
  @Roles('CHEF', 'MANAGER')
  list(@CurrentUser() user: AuthUser) {
    return this.promos.list(user);
  }

  /** Кассир кодро пеш аз фурӯш месанҷад */
  @Get('check')
  @Feature('pos')
  check(@CurrentUser() user: AuthUser, @Query('code') code = '', @Query('total') total = '0') {
    return this.promos.check(user.organizationId, code, Number(total) || 0, 'pos');
  }

  @Post()
  @Feature('customers')
  @Roles('CHEF')
  create(@CurrentUser() user: AuthUser, @Body() dto: PromoDtoIn) {
    return this.promos.create(user, dto);
  }

  @Patch(':id')
  @Feature('customers')
  @Roles('CHEF')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: PromoDtoIn) {
    return this.promos.update(user, id, dto);
  }

  @Delete(':id')
  @Feature('customers')
  @Roles('CHEF')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.promos.remove(user, id);
  }
}

@Module({
  controllers: [PromosController],
  providers: [PromosService],
  exports: [PromosService],
})
export class PromosModule {}
