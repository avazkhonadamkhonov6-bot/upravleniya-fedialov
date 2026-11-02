import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Global,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  OnApplicationBootstrap,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  BILLING_PERIODS,
  effectivePlan,
  PAID_PLANS,
  PLAN_GRACE_DAYS,
  PLAN_INFO,
  PLAN_PAYMENT_STATUSES,
  PLANS,
  planPrice,
  type BillingInfo,
  type BillingPeriod,
  type PaymentCard,
  type Plan,
  type PlanPayment as PlanPaymentDto,
  type PlanPaymentStatus,
} from '@filialhub/shared';
import { AdminService } from '../admin/admin';
import { AllowPending, AuthUser, CurrentUser, Feature, Roles, SuperAdmin } from '../auth/decorators';
import { DEMO_EMAILS } from '../auth/demo-guard';
import { TZ } from '../common/time';
import type { Organization, PlanPayment, User } from '../generated/prisma/client';
import { escape, NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const CARD_KEY = 'billing.card';
const DAY = 86_400_000;

/** Ба куҷо пул фиристода шавад — то супер-админ дар /admin иваз накунад */
const DEFAULT_CARD: PaymentCard = {
  number: process.env.PAYMENT_CARD_NUMBER?.trim() || '',
  holder: process.env.PAYMENT_CARD_HOLDER?.trim() || '',
  bank: process.env.PAYMENT_BANK?.trim() || 'DC · Alif Mobi · Alif Visa',
  phone: process.env.PAYMENT_PHONE?.trim() || '+992073792424',
  note: 'Ба ҳамин рақам дар DC Wallet, Alif Mobi ё ба корти Alif Visa (бо рақами телефон) гузаронед.',
};

// ---------- DTO ----------

export class PaymentRequestDto {
  @IsIn(PAID_PLANS, { message: 'Тарифро интихоб кунед' })
  plan!: Exclude<Plan, 'FREE'>;

  @IsIn(BILLING_PERIODS, { message: 'Мӯҳлатро интихоб кунед' })
  months!: BillingPeriod;

  /** Рақами чек ё 4 рақами охири корт / телефони фиристанда */
  @IsString() @MaxLength(120)
  reference!: string;
}

export class RejectPaymentDto {
  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class GrantPlanDto {
  @IsIn(PLANS)
  plan!: Plan;

  /** Чанд рӯз; холӣ — бемӯҳлат */
  @IsOptional() @IsInt() @Min(1) @Max(3650)
  days?: number;
}

export class PaymentCardDto implements PaymentCard {
  @IsString() @MaxLength(40) number!: string;
  @IsString() @MaxLength(80) holder!: string;
  @IsString() @MaxLength(80) bank!: string;
  @IsString() @MaxLength(30) phone!: string;
  @IsString() @MaxLength(300) note!: string;
}

type OrgPlan = Pick<Organization, 'plan' | 'planUntil' | 'isPlatform'>;

// ---------- Service ----------

/**
 * Тарифҳо: бизнеси нав «Озмоишӣ» аст (1 филиал, 4 корманд). Соҳиб тариф интихоб карда ба рақами платформа пул мефиристад
 * ва «Ман пардохтам»-ро пахш мекунад; супер-админ пулро дида тасдиқ мекунад — танҳо баъд маҳдудият кушода мешавад.
 * Пас аз тамом шудани мӯҳлат 3 рӯзи имтиёзӣ, баъд бизнес ба маҳдудиятҳои ройгон бармегардад (маълумот нест намешавад).
 */
@Injectable()
export class BillingService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Billing');
  /** orgId → кормандоне, ки аз ҳадди тариф берун мондаанд (кеш 60 сония, то ҳар дархост базаро напурсад) */
  private readonly lockCache = new Map<number, { at: number; locked: Set<number> }>();
  private demoOrgs: { at: number; ids: Set<number> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly admin: AdminService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const res = await this.prisma.organization.updateMany({
        where: { ...(await this.freeWhere()), NOT: { plan: 'ENTERPRISE', planUntil: null } },
        data: { plan: 'ENTERPRISE', planUntil: null },
      });
      if (res.count) this.logger.log(`Демо ва бизнесҳои супер-админ: тарифи бемаҳдуд (${res.count})`);
    } catch (e) {
      this.logger.warn(`Демо: ${(e as Error).message}`);
    }
  }

  planOf(o: OrgPlan): Plan {
    return o.isPlatform ? 'ENTERPRISE' : effectivePlan(o);
  }

  private async usage(organizationId: number) {
    const [branches, employees] = await Promise.all([
      this.prisma.branch.count({ where: { organizationId, isActive: true } }),
      this.prisma.user.count({ where: { organizationId, isActive: true, role: { not: 'CHEF' } } }),
    ]);
    return { branches, employees };
  }

  /** Пеш аз илова (ё фаъол кардани) филиал ё корманд: агар ҳадди тариф пур бошад — 402 бо матни фаҳмо */
  async assertCanAdd(organizationId: number, what: 'branch' | 'employee') {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const info = PLAN_INFO[this.planOf(org)];
    const limit = what === 'branch' ? info.branches : info.employees;
    if (limit === null) return;
    const used = (await this.usage(organizationId))[what === 'branch' ? 'branches' : 'employees'];
    if (used < limit) return;
    if (await this.grantIfFree(organizationId)) return;
    const unit = what === 'branch' ? 'филиал' : 'корманд';
    throw new HttpException(
      `Тарифи «${info.name}»: ҳадди аксар ${limit} ${unit}. Барои илова кардан дар бахши «Тариф ва пардохт» тарифи калонтар интихоб кунед.`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  /**
   * Тариф тамом шуд ва кормандон аз ҳадди ройгон зиёданд: кормандони охир иловашуда то пардохт ворид шуда наметавонанд.
   * Менеҷерҳо ва кормандони кӯҳна аввал ҷой мегиранд. Маълумоти ҳеҷ кас нест намешавад.
   */
  async isLocked(user: Pick<User, 'id' | 'role' | 'organizationId'>, org: OrgPlan): Promise<boolean> {
    if (user.role === 'CHEF') return false;
    const limit = PLAN_INFO[this.planOf(org)].employees;
    if (limit === null) return false;
    const hit = this.lockCache.get(user.organizationId);
    if (hit && Date.now() - hit.at < 60_000) return hit.locked.has(user.id);
    const staff = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true, role: { not: 'CHEF' } },
      select: { id: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    let locked = new Set(staff.slice(limit).map((s) => s.id));
    if (locked.size && (await this.grantIfFree(user.organizationId))) locked = new Set();
    if (this.lockCache.size > 5000) this.lockCache.clear();
    this.lockCache.set(user.organizationId, { at: Date.now(), locked });
    return locked.has(user.id);
  }

  /** Бизнесҳои демо (кеш 5 дақиқа) — барои ҳимояи демо аз вайроншавӣ */
  async isDemoOrg(organizationId: number): Promise<boolean> {
    if (!this.demoOrgs || Date.now() - this.demoOrgs.at > 300_000) {
      const rows = await this.prisma.organization.findMany({ where: { users: { some: { email: { in: DEMO_EMAILS } } } }, select: { id: true } });
      this.demoOrgs = { at: Date.now(), ids: new Set(rows.map((r) => r.id)) };
    }
    return this.demoOrgs.ids.has(organizationId);
  }

  /** Пас аз ивази тариф ё кормандон */
  invalidate(organizationId: number) {
    this.lockCache.delete(organizationId);
  }

  async info(actor: AuthUser): Promise<BillingInfo> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
    const [usage, payments, card, isDemo] = await Promise.all([
      this.usage(org.id),
      this.prisma.planPayment.findMany({ where: { organizationId: org.id }, orderBy: { id: 'desc' }, take: 20 }),
      this.card(),
      this.isDemo(org.id),
    ]);
    if (isDemo && (org.plan !== 'ENTERPRISE' || org.planUntil)) {
      await this.grantIfFree(org.id);
      Object.assign(org, { plan: 'ENTERPRISE', planUntil: null });
    }
    const effective = this.planOf(org);
    const info = PLAN_INFO[effective];
    const plan = (PLANS as readonly string[]).includes(org.plan) ? (org.plan as Plan) : 'FREE';
    return {
      plan,
      effective,
      planUntil: plan === 'FREE' ? null : (org.planUntil?.toISOString() ?? null),
      daysLeft: plan !== 'FREE' && org.planUntil ? Math.ceil((org.planUntil.getTime() - Date.now()) / DAY) : null,
      usage,
      limits: { branches: info.branches, employees: info.employees },
      pending: payments.find((p) => p.status === 'PENDING') ? this.toDto(payments.find((p) => p.status === 'PENDING')!, org) : null,
      history: payments.map((p) => this.toDto(p, org)),
      card,
      isDemo,
    };
  }

  async request(actor: AuthUser, dto: PaymentRequestDto) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
    if (org.isPlatform || (await this.isDemo(org.id))) throw new BadRequestException('Ин ҳисоб пардохт лозим надорад');
    if (await this.prisma.planPayment.findFirst({ where: { organizationId: org.id, status: 'PENDING' } })) {
      throw new BadRequestException('Пардохти пешинаи шумо ҳоло санҷида мешавад. Интизор шавед ё онро бекор кунед.');
    }
    const reference = dto.reference.trim();
    if (reference.length < 3) throw new BadRequestException('Рақами чек ё 4 рақами охири корт/телефонро нависед, то пулро ёбем');
    const amount = planPrice(dto.plan, dto.months);
    const p = await this.prisma.planPayment.create({
      data: { organizationId: org.id, plan: dto.plan, months: dto.months, amount, reference, createdById: actor.id },
    });
    const owner = await this.prisma.user.findUnique({ where: { id: actor.id } });
    void this.admin
      .notifyAdmins(
        [
          '💳 <b>Пардохти нав — санҷед</b>',
          '',
          `🏪 <b>${escape(org.name)}</b> (#${org.id})`,
          `Тариф: <b>${escape(PLAN_INFO[dto.plan].name)}</b> · ${dto.months} моҳ`,
          `Маблағ: <b>${amount} сомонӣ</b>`,
          `Чек / рақам: ${escape(reference)}`,
          owner ? `👤 ${escape(owner.fullName)} · ${escape(owner.phone)}` : '',
          '',
          `Пул омад: /paid ${p.id}`,
          `Пул наомад: /unpaid ${p.id} сабаб`,
        ]
          .filter((l, i, a) => l || a[i - 1])
          .join('\n'),
      )
      .catch((e) => this.logger.warn(`Огоҳинома: ${(e as Error).message}`));
    return this.toDto(p, org);
  }

  async cancel(actor: AuthUser, id: number) {
    const res = await this.prisma.planPayment.updateMany({
      where: { id, organizationId: actor.organizationId, status: 'PENDING' },
      data: { status: 'CANCELLED', decidedAt: new Date() },
    });
    if (!res.count) throw new BadRequestException('Ин пардохт аллакай санҷида шуд');
    return { ok: true };
  }

  // ---------- Супер-админ ----------

  async list(status?: PlanPaymentStatus): Promise<PlanPaymentDto[]> {
    const rows = await this.prisma.planPayment.findMany({
      where: { status },
      include: { organization: true },
      orderBy: { id: 'desc' },
      take: 200,
    });
    const ownerIds = [...new Set(rows.map((r) => r.organization.ownerId).filter((x): x is number => !!x))];
    const owners = ownerIds.length ? await this.prisma.user.findMany({ where: { id: { in: ownerIds } } }) : [];
    return rows.map((r) => {
      const o = owners.find((u) => u.id === r.organization.ownerId);
      return { ...this.toDto(r, r.organization), owner: o ? { fullName: o.fullName, phone: o.phone, email: o.email } : null };
    });
  }

  async decide(actor: Pick<AuthUser, 'id' | 'fullName'>, id: number, approve: boolean, note = '') {
    const p = await this.prisma.planPayment.findUnique({ where: { id }, include: { organization: true } });
    if (!p) throw new NotFoundException('Пардохт ёфт нашуд');
    if (p.status !== 'PENDING') throw new BadRequestException('Ин пардохт аллакай санҷида шуд');
    if (!approve && !note.trim()) throw new BadRequestException('Сабабро нависед (масалан: «пул наомад»)');

    const org = await this.prisma.$transaction(async (tx) => {
      // Шарт дар where: агар ду админ якбора пахш кунанд, тариф ду бор дароз намешавад
      const res = await tx.planPayment.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: approve ? 'APPROVED' : 'REJECTED', note: approve ? '' : note.trim(), decidedAt: new Date(), decidedById: actor.id },
      });
      if (!res.count) throw new BadRequestException('Ин пардохт ҳоло санҷида шуд — саҳифаро нав кунед');
      const current = await tx.organization.findUniqueOrThrow({ where: { id: p.organizationId } });
      if (!approve) return current;
      return tx.organization.update({
        where: { id: current.id },
        data: { plan: p.plan, planUntil: this.extend(current, p.plan as Plan, p.months) },
      });
    });
    this.invalidate(org.id);
    this.logger.log(`${actor.fullName}: пардохти #${id} (${org.name}) → ${approve ? 'APPROVED' : 'REJECTED'}`);

    const until = org.planUntil ? this.date(org.planUntil) : '';
    void this.notifyOwner(
      org,
      approve
        ? `✅ Пардохти <b>${Number(p.amount)} сомонӣ</b> қабул шуд. Ташаккур!\nТарифи <b>${escape(PLAN_INFO[p.plan as Plan].name)}</b> то ${until} фаъол аст.`
        : `❌ Пардохти <b>${Number(p.amount)} сомонӣ</b> тасдиқ нашуд.\nСабаб: ${escape(note.trim())}\nАгар пул фиристода бошед, чекро ба мо фиристед.`,
    );
    const updated = await this.prisma.planPayment.findUniqueOrThrow({ where: { id } });
    return this.toDto(updated, org);
  }

  /** Супер-админ дастӣ тариф медиҳад (тӯҳфа, шартнома, демо). days холӣ — бемӯҳлат */
  async grant(actor: Pick<AuthUser, 'fullName'>, organizationId: number, dto: GrantPlanDto) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || org.isPlatform) throw new NotFoundException('Бизнес ёфт нашуд');
    const planUntil = dto.plan === 'FREE' || !dto.days ? null : new Date(Date.now() + dto.days * DAY);
    const updated = await this.prisma.organization.update({ where: { id: org.id }, data: { plan: dto.plan, planUntil } });
    this.invalidate(org.id);
    this.logger.log(`${actor.fullName}: «${org.name}» → ${dto.plan} ${dto.days ? `${dto.days} рӯз` : 'бемӯҳлат'}`);
    if (dto.plan !== 'FREE') {
      void this.notifyOwner(updated, `🎁 Ба бизнеси <b>${escape(org.name)}</b> тарифи <b>${escape(PLAN_INFO[dto.plan].name)}</b> дода шуд${planUntil ? ` — то ${this.date(planUntil)}` : ''}.`);
    }
    return { plan: dto.plan, planUntil: planUntil?.toISOString() ?? null };
  }

  async card(): Promise<PaymentCard> {
    const saved = await this.prisma.appSetting.findUnique({ where: { key: CARD_KEY } });
    if (!saved) return DEFAULT_CARD;
    try {
      return { ...DEFAULT_CARD, ...(JSON.parse(saved.value) as Partial<PaymentCard>) };
    } catch {
      return DEFAULT_CARD;
    }
  }

  async setCard(dto: PaymentCardDto): Promise<PaymentCard> {
    const value: PaymentCard = { number: dto.number.trim(), holder: dto.holder.trim(), bank: dto.bank.trim(), phone: dto.phone.trim(), note: dto.note.trim() };
    await this.prisma.appSetting.upsert({ where: { key: CARD_KEY }, create: { key: CARD_KEY, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
    return value;
  }

  /** Командаҳои бот: /payments, /paid 5, /unpaid 5 сабаб */
  async botCommand(user: User, command: string, args: string[]): Promise<string | null> {
    if (!['/payments', '/paid', '/unpaid'].includes(command)) return null;
    if (!user.isSuperAdmin) return 'Ин команда танҳо барои супер-админ аст.';
    if (command === '/payments') {
      const rows = await this.list('PENDING');
      if (!rows.length) return '✅ Пардохти интизор нест.';
      return [
        `💳 <b>Интизори санҷиш: ${rows.length}</b>`,
        '',
        ...rows.slice(0, 20).map((p) => `#${p.id} <b>${escape(p.organizationName)}</b> — ${escape(PLAN_INFO[p.plan].name)}, ${p.months} моҳ, <b>${p.amount} сомонӣ</b>\n   чек: ${escape(p.reference)}`),
        '',
        '/paid ID — пул омад · /unpaid ID сабаб — пул наомад',
      ].join('\n');
    }
    const id = Number(args[0]?.replace('#', ''));
    if (!Number.isInteger(id) || id <= 0) return `Рақами пардохтро нависед, масалан: ${command} 5`;
    try {
      const p = await this.decide(user, id, command === '/paid', args.slice(1).join(' '));
      return command === '/paid'
        ? `✅ <b>${escape(p.organizationName)}</b> — тарифи ${escape(PLAN_INFO[p.plan].name)} кушода шуд. Ба соҳиб хабар дода шуд.`
        : `⛔ Пардохти #${id} рад шуд. Ба соҳиб хабар дода шуд.`;
    } catch (e) {
      return `❌ ${escape((e as Error).message)}`;
    }
  }

  /** Ҳар рӯз 10:00: 3 ва 1 рӯз пеш аз тамом, рӯзи тамом ва пас аз рӯзҳои имтиёзӣ ба соҳиб хабар медиҳем */
  @Cron('0 0 10 * * *', { name: 'plan-reminders', timeZone: TZ })
  async reminders() {
    const now = Date.now();
    const orgs = await this.prisma.organization.findMany({
      where: {
        isPlatform: false,
        plan: { not: 'FREE' },
        planUntil: { gt: new Date(now - (PLAN_GRACE_DAYS + 1) * DAY), lte: new Date(now + 3 * DAY) },
      },
    });
    for (const org of orgs) {
      const left = org.planUntil!.getTime() - now;
      const name = escape(PLAN_INFO[org.plan as Plan]?.name ?? org.plan);
      let text = '';
      if (left > 2 * DAY) text = `⏰ Тарифи <b>${name}</b> пас аз 3 рӯз (${this.date(org.planUntil!)}) тамом мешавад. Барои дароз кардан: «Тариф ва пардохт».`;
      else if (left > 0 && left <= DAY) text = `⏰ Тарифи <b>${name}</b> пагоҳ тамом мешавад. Барои он ки кор қатъ нашавад, пардохтро имрӯз кунед.`;
      else if (left <= 0 && left > -DAY) text = `⚠️ Тарифи <b>${name}</b> тамом шуд. ${PLAN_GRACE_DAYS} рӯз ҳамааш мисли пеш кор мекунад — дар ин муддат пардохт кунед.`;
      else if (left <= -PLAN_GRACE_DAYS * DAY) {
        text = `⛔ Тарифи <b>${name}</b> қатъ шуд — ҳоло маҳдудияти ройгон амал мекунад (${PLAN_INFO.FREE.branches} филиал, ${PLAN_INFO.FREE.employees} корманд). Маълумоти шумо пурра нигоҳ дошта шудааст; пас аз пардохт ҳама чиз фавран кушода мешавад.`;
        this.invalidate(org.id);
      }
      if (text) await this.notifyOwner(org, text);
    }
  }

  // ---------- ёрирасон ----------

  /**
   * Мӯҳлати нав. Агар тарифи ҷорӣ ҳанӯз амал кунад, рӯзҳои боқимонда гум намешаванд:
   * ҳамон тариф — илова мешавад; тарифи дигар — бо нарх ба рӯзҳои тарифи нав табдил дода мешавад.
   */
  private extend(org: Organization, plan: Plan, months: number): Date {
    const now = Date.now();
    const current = this.planOf(org);
    let start = now;
    if (current !== 'FREE' && org.planUntil && org.planUntil.getTime() > now) {
      const remaining = org.planUntil.getTime() - now;
      start = now + (current === plan ? remaining : (remaining * PLAN_INFO[current].price) / PLAN_INFO[plan].price);
    }
    const d = new Date(start);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  /** Демо ва бизнесҳои супер-админ ҳамеша ройгон ва бемаҳдуданд */
  private async freeWhere() {
    // Шеф метавонад байни бизнесҳояш гузарад — бинобар ин аз рӯи соҳиб (ownerId) месанҷем, на аз рӯи аъзоён
    const admins = await this.prisma.user.findMany({ where: { isSuperAdmin: true }, select: { id: true } });
    return {
      OR: [
        { isPlatform: true },
        { users: { some: { email: { in: DEMO_EMAILS } } } },
        ...(admins.length ? [{ ownerId: { in: admins.map((a) => a.id) } }, { users: { some: { isSuperAdmin: true } } }] : []),
      ],
    };
  }

  private async isDemo(organizationId: number) {
    return !!(await this.prisma.organization.findFirst({ where: { id: organizationId, ...(await this.freeWhere()) }, select: { id: true } }));
  }

  /**
   * Супер-админ метавонад баъдтар таъин шавад (SUPERADMIN_EMAILS) ё бизнеси нав созад — пеш аз маҳдуд кардан месанҷем
   * ва чунин бизнесро якбора бемаҳдуд мекунем.
   */
  private async grantIfFree(organizationId: number) {
    if (!(await this.isDemo(organizationId))) return false;
    await this.prisma.organization.update({ where: { id: organizationId }, data: { plan: 'ENTERPRISE', planUntil: null } });
    this.invalidate(organizationId);
    return true;
  }

  private date(d: Date) {
    return d.toLocaleDateString('ru-RU', { timeZone: TZ });
  }

  private async notifyOwner(org: Organization, text: string) {
    try {
      if (!org.ownerId) return;
      const owner = await this.prisma.user.findUnique({ where: { id: org.ownerId } });
      if (owner) await this.notifications.notifyUser(owner, text);
    } catch (e) {
      this.logger.warn(`Огоҳинома ба соҳиб: ${(e as Error).message}`);
    }
  }

  private toDto(p: PlanPayment, org: Pick<Organization, 'name'>): PlanPaymentDto {
    return {
      id: p.id,
      organizationId: p.organizationId,
      organizationName: org.name,
      plan: p.plan as Plan,
      months: p.months,
      amount: Number(p.amount),
      reference: p.reference,
      status: p.status,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
      decidedAt: p.decidedAt?.toISOString() ?? null,
    };
  }
}

// ---------- Controllers ----------

/** Соҳиби бизнес: тариф, истифода ва пардохт. Барои бизнеси ҳанӯз тасдиқнашуда ҳам кушода аст. */
@Controller('billing')
@Feature('billing')
@Roles('CHEF')
@AllowPending()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  info(@CurrentUser() user: AuthUser) {
    return this.billing.info(user);
  }

  @Post('payments')
  request(@CurrentUser() user: AuthUser, @Body() dto: PaymentRequestDto) {
    return this.billing.request(user, dto);
  }

  @Post('payments/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.billing.cancel(user, id);
  }
}

@Controller('admin/billing')
@Feature('admin')
@SuperAdmin()
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('payments')
  list(@Query('status') status?: string) {
    return this.billing.list(PLAN_PAYMENT_STATUSES.includes(status as PlanPaymentStatus) ? (status as PlanPaymentStatus) : undefined);
  }

  @Post('payments/:id/approve')
  @HttpCode(200)
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.billing.decide(user, id, true);
  }

  @Post('payments/:id/reject')
  @HttpCode(200)
  reject(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RejectPaymentDto) {
    return this.billing.decide(user, id, false, dto.note);
  }

  @Post('businesses/:id/plan')
  @HttpCode(200)
  grant(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: GrantPlanDto) {
    return this.billing.grant(user, id, dto);
  }

  @Get('card')
  card() {
    return this.billing.card();
  }

  @Put('card')
  setCard(@Body() dto: PaymentCardDto) {
    return this.billing.setCard(dto);
  }
}

@Global()
@Module({
  controllers: [BillingController, AdminBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
