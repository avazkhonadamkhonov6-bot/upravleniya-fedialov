import { BadRequestException, Body, Controller, Get, HttpCode, Injectable, Logger, Module, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { formatMoney, type Customer as CustomerDto, type DebtEntry as DebtEntryDto, type DebtSummary } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { TZ } from '../common/time';
import { AuditService } from '../core/audit.service';
import { toCustomer } from '../customers/customers';
import { Prisma } from '../generated/prisma/client';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

export class PayDebtDto {
  @Type(() => Number) @IsNumber() @Min(0.01, { message: 'Маблағро нависед' })
  amount: number;

  @IsIn(['CASH', 'CARD'])
  payment: 'CASH' | 'CARD';

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

export class AddDebtDto {
  @Type(() => Number) @IsNumber() @Min(0.01, { message: 'Маблағро нависед' })
  amount: number;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Ёдрас на зудтар аз 6 рӯз (ҳар ҳафта) */
const REMIND_EVERY_MS = 6 * 86_400_000;

/**
 * Дафтари қарз: мизоҷ ба қарз мегирад (POS, «Қарз») ё қарзи дастӣ илова мешавад,
 * пардохтҳо қарзро кам мекунанд. Ба мизоҷ дар WhatsApp-и бизнес хабар меравад:
 * фавран ҳангоми қарз/пардохт ва ҳар ҳафта то пардохти пурра.
 */
@Injectable()
export class DebtsService {
  private readonly logger = new Logger('Debts');

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly audit: AuditService,
  ) {}

  /** Дар дохили транзаксияи фурӯш (POS): фурӯш ба қарз */
  async addFromSale(tx: Tx, p: { organizationId: number; customerId: number; orderId: number; amount: number; userId: number }) {
    await tx.debtEntry.create({ data: { organizationId: p.organizationId, customerId: p.customerId, orderId: p.orderId, amount: p.amount, userId: p.userId } });
    await tx.customer.update({ where: { id: p.customerId }, data: { debt: { increment: p.amount } } });
  }

  async summary(user: AuthUser): Promise<DebtSummary> {
    const agg = await this.prisma.customer.aggregate({ where: { organizationId: user.organizationId, debt: { gt: 0 } }, _sum: { debt: true }, _count: true });
    const whatsapp = !!(await this.whatsapp.greenFor(user.organizationId)) || this.whatsapp.configured;
    return { total: r2(Number(agg._sum.debt ?? 0)), debtors: agg._count, whatsapp };
  }

  async debtors(user: AuthUser, q: string): Promise<CustomerDto[]> {
    const search = q.trim();
    const rows = await this.prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
        debt: { gt: 0 },
        ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search.replace(/\D/g, '') || search } }] } : {}),
      },
      include: { branch: { select: { name: true } } },
      orderBy: { debt: 'desc' },
      take: 500,
    });
    return rows.map(toCustomer);
  }

  async history(user: AuthUser, customerId: number): Promise<{ customer: CustomerDto; entries: DebtEntryDto[] }> {
    const c = await this.customer(user, customerId);
    const rows = await this.prisma.debtEntry.findMany({ where: { customerId }, include: { user: { select: { fullName: true } } }, orderBy: { id: 'desc' }, take: 200 });
    return {
      customer: toCustomer(c),
      entries: rows.map((e) => ({ id: e.id, amount: Number(e.amount), payment: e.payment, note: e.note, orderId: e.orderId, userName: e.user?.fullName ?? null, createdAt: e.createdAt.toISOString() })),
    };
  }

  /** Пардохти қарз (пурра ё қисман) */
  async pay(user: AuthUser, customerId: number, dto: PayDebtDto) {
    const c = await this.customer(user, customerId);
    const debt = Number(c.debt);
    if (debt <= 0) throw new BadRequestException('Ин мизоҷ қарз надорад');
    const amount = r2(Math.min(dto.amount, debt));
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.debtEntry.create({ data: { organizationId: user.organizationId, customerId, amount: -amount, payment: dto.payment, note: dto.note?.trim() ?? '', userId: user.id } });
      return tx.customer.update({ where: { id: customerId }, data: { debt: { decrement: amount } }, include: { branch: { select: { name: true } } } });
    });
    this.audit.log(user, 'UPDATE', 'customer', customerId, `Пардохти қарз: ${c.fullName} — ${amount} сомонӣ`);
    const left = Number(updated.debt);
    void this.notify(user.organizationId, c.phone, left > 0
      ? `Ассалому алейкум, ${c.fullName}!\nПардохти шумо ${formatMoney(amount)} қабул шуд. Ташаккур!\nҚарзи боқимонда: ${formatMoney(left)}.`
      : `Ассалому алейкум, ${c.fullName}!\nПардохти шумо ${formatMoney(amount)} қабул шуд. Қарзи шумо пурра пардохт шуд. Ташаккур! 🙏`);
    return toCustomer(updated);
  }

  /** Қарзи дастӣ (масалан мол бе POS ё қарзи кӯҳна аз дафтари коғазӣ) */
  async add(user: AuthUser, customerId: number, dto: AddDebtDto) {
    const c = await this.customer(user, customerId);
    const amount = r2(dto.amount);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.debtEntry.create({ data: { organizationId: user.organizationId, customerId, amount, note: dto.note?.trim() ?? '', userId: user.id } });
      return tx.customer.update({ where: { id: customerId }, data: { debt: { increment: amount } }, include: { branch: { select: { name: true } } } });
    });
    this.audit.log(user, 'UPDATE', 'customer', customerId, `Қарзи нав: ${c.fullName} — ${amount} сомонӣ`);
    await this.sendNewDebt(user.organizationId, { fullName: c.fullName, phone: c.phone, debt: Number(updated.debt) }, amount);
    return toCustomer(updated);
  }

  /** Паём пас аз фурӯш ба қарз (берун аз транзаксия) */
  async sendNewDebt(organizationId: number, c: { fullName: string; phone: string; debt: number }, amount: number) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    return this.notify(
      organizationId,
      c.phone,
      `Ассалому алейкум, ${c.fullName}!\nШумо аз «${org?.name ?? ''}» ба маблағи ${formatMoney(amount)} ба қарз гирифтед.\nҚарзи умумӣ: ${formatMoney(c.debt)}.`,
    );
  }

  /** Ёдраси дастӣ аз саҳифаи «Дафтари қарз» */
  async remind(user: AuthUser, customerId: number) {
    const c = await this.customer(user, customerId);
    if (Number(c.debt) <= 0) throw new BadRequestException('Ин мизоҷ қарз надорад');
    const status = await this.sendReminder(c);
    return { status };
  }

  /** Ҳар рӯз соати 10:00: ба қарздороне, ки 6+ рӯз ёдрас нагирифтаанд — ҳамин тавр ҳар мизоҷ ҳафтае як бор */
  @Cron('0 0 10 * * *', { name: 'debt-reminders', timeZone: TZ })
  async weekly() {
    const due = await this.prisma.customer.findMany({
      where: {
        debt: { gt: 0 },
        OR: [{ debtRemindedAt: null }, { debtRemindedAt: { lt: new Date(Date.now() - REMIND_EVERY_MS) } }],
        // Ёдраси аввал на зудтар аз як ҳафта пас аз қарз
        debtEntries: { some: { amount: { gt: 0 }, createdAt: { lt: new Date(Date.now() - REMIND_EVERY_MS) } } },
      },
      take: 300,
    });
    let sent = 0;
    for (const c of due) {
      if ((await this.sendReminder(c)) === 'SENT') sent++;
      // Green-API паёмҳои зуд-зудро маҳдуд мекунад
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (due.length) this.logger.log(`Ёдраси қарз: ${sent}/${due.length} фиристода шуд`);
  }

  private async sendReminder(c: { id: number; organizationId: number; fullName: string; phone: string; debt: Prisma.Decimal }) {
    const org = await this.prisma.organization.findUnique({ where: { id: c.organizationId }, select: { name: true } });
    const status = await this.notify(
      c.organizationId,
      c.phone,
      `Ассалому алейкум, ${c.fullName}!\nЁдрас аз «${org?.name ?? ''}»: қарзи шумо ${formatMoney(Number(c.debt))} аст.\nЛутфан ҳангоми имкон пардохт кунед. Ташаккур!`,
    );
    await this.prisma.customer.update({ where: { id: c.id }, data: { debtRemindedAt: new Date() } });
    return status;
  }

  private async notify(organizationId: number, phone: string, text: string) {
    try {
      const r = await this.whatsapp.send(phone, text, organizationId);
      return r.status;
    } catch (e) {
      this.logger.warn(`WhatsApp → ${phone}: ${(e as Error).message}`);
      return 'FAILED' as const;
    }
  }

  private async customer(user: AuthUser, id: number) {
    const c = await this.prisma.customer.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
    if (!c || c.organizationId !== user.organizationId) throw new NotFoundException('Мизоҷ ёфт нашуд');
    return c;
  }
}

@Controller('debts')
@Feature('debts')
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.debts.summary(user);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    return this.debts.debtors(user, q);
  }

  @Get(':customerId')
  history(@CurrentUser() user: AuthUser, @Param('customerId', ParseIntPipe) id: number) {
    return this.debts.history(user, id);
  }

  @Post(':customerId/pay')
  @HttpCode(200)
  pay(@CurrentUser() user: AuthUser, @Param('customerId', ParseIntPipe) id: number, @Body() dto: PayDebtDto) {
    return this.debts.pay(user, id, dto);
  }

  @Post(':customerId/add')
  @HttpCode(200)
  add(@CurrentUser() user: AuthUser, @Param('customerId', ParseIntPipe) id: number, @Body() dto: AddDebtDto) {
    return this.debts.add(user, id, dto);
  }

  @Post(':customerId/remind')
  @HttpCode(200)
  remind(@CurrentUser() user: AuthUser, @Param('customerId', ParseIntPipe) id: number) {
    return this.debts.remind(user, id);
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}
