import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Global,
  HttpCode,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  OnApplicationBootstrap,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  BUSINESS_TYPE_LABELS,
  ORG_STATUS_LABELS,
  ORG_STATUSES,
  type AdminBusiness,
  type AdminBusinessDetail,
  type AdminOverview,
  type BusinessType,
  type OrgStatus,
} from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, SuperAdmin } from '../auth/decorators';
import { toBranch, toUser } from '../common/serializers';
import type { Organization, User } from '../generated/prisma/client';
import { escape, NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------- DTO ----------

export class ReviewDto {
  /** Сабаби рад ё бастан (ба соҳиб фиристода мешавад) */
  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

/** Амалҳои супер-админ бо бизнес */
type Decision = 'approve' | 'reject' | 'block';

const NEXT_STATUS: Record<Decision, OrgStatus> = { approve: 'APPROVED', reject: 'REJECTED', block: 'BLOCKED' };

/** Аз кадом ҳолат ба кадом ҳолат гузаштан мумкин аст */
const ALLOWED_FROM: Record<Decision, readonly OrgStatus[]> = {
  approve: ['PENDING', 'REJECTED', 'BLOCKED'],
  reject: ['PENDING'],
  block: ['APPROVED'],
};

type OrgWithCounts = Organization & { _count: { branches: number; users: number; products: number } };

// ---------- Service ----------

/**
 * Платформа: ҳар кас бизнес сабт карда метавонад, вале бизнес то тасдиқи супер-админ кор намекунад.
 * Супер-админ дархостҳоро дар сайт ё бо боти Telegram/WhatsApp (/pending, /approve 12, /reject 12 сабаб) мебинад.
 */
@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger('SuperAdmin');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Супер-админҳо аз .env: SUPERADMIN_EMAILS (бо вергул). Агар корбар бо ин почта бошад — супер-админ мешавад;
   * агар набошад ва SUPERADMIN_PASSWORD дода шуда бошад — ҳисоби нав (бо ширкати платформа) сохта мешавад.
   */
  async onApplicationBootstrap() {
    const emails = (process.env.SUPERADMIN_EMAILS ?? process.env.SUPERADMIN_EMAIL ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) {
      this.logger.log('SUPERADMIN_EMAILS нест — супер-админ аз .env сохта намешавад');
      return;
    }
    const password = process.env.SUPERADMIN_PASSWORD?.trim();
    const phone = process.env.SUPERADMIN_PHONE?.trim() ?? '';
    for (const email of emails) {
      try {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
          // Телефон аз .env танҳо агар дар профил холӣ бошад — рақами худи супер-админро иваз намекунем.
          if (!existing.isSuperAdmin || (phone && !existing.phone)) {
            await this.prisma.user.update({ where: { id: existing.id }, data: { isSuperAdmin: true, isActive: true, phone: existing.phone || phone } });
          }
          this.logger.log(`Супер-админ: ${email}`);
          continue;
        }
        if (await this.prisma.client.findUnique({ where: { email } })) {
          this.logger.warn(`${email} — ҳисоби мизоҷ аст, супер-админ шуда наметавонад`);
          continue;
        }
        if (!password || password.length < 8) {
          this.logger.warn(`${email} ёфт нашуд: барои сохтан SUPERADMIN_PASSWORD (камаш 8 аломат) лозим аст`);
          continue;
        }
        await this.prisma.user.create({
          data: {
            fullName: 'Супер-админ',
            email,
            phone,
            passwordHash: await bcrypt.hash(password, 10),
            role: 'CHEF',
            isSuperAdmin: true,
            organization: { create: { name: 'FilialHub — Платформа', type: 'OTHER', isPublic: false, isPlatform: true, status: 'APPROVED' } },
          },
        });
        this.logger.log(`Супер-админ сохта шуд: ${email}`);
      } catch (e) {
        this.logger.error(`Супер-админ ${email}: ${(e as Error).message}`);
      }
    }
  }

  async overview(): Promise<AdminOverview> {
    const [byStatus, branches, employees, clients] = await Promise.all([
      this.prisma.organization.groupBy({ by: ['status'], _count: { _all: true }, where: this.realBusinesses() }),
      this.prisma.branch.count({ where: { organization: this.realBusinesses() } }),
      this.prisma.user.count({ where: { organization: this.realBusinesses() } }),
      this.prisma.client.count(),
    ]);
    const count = (s: OrgStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    return {
      businesses: byStatus.reduce((s, r) => s + r._count._all, 0),
      pending: count('PENDING'),
      approved: count('APPROVED'),
      rejected: count('REJECTED'),
      blocked: count('BLOCKED'),
      branches,
      employees,
      clients,
    };
  }

  async list(filter: { status?: OrgStatus; q?: string }): Promise<AdminBusiness[]> {
    const q = filter.q?.trim();
    const rows = await this.prisma.organization.findMany({
      where: {
        ...this.realBusinesses(),
        status: filter.status,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { users: { some: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } } }] } : {}),
      },
      include: { _count: { select: { branches: true, users: true, products: true } } },
      // Дархостҳои нав аввал
      orderBy: [{ createdAt: 'desc' }],
      take: 500,
    });
    return this.withOwners(rows);
  }

  async detail(id: number): Promise<AdminBusinessDetail> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { branches: true, users: true, products: true } },
        branches: { orderBy: { id: 'asc' }, include: { _count: { select: { users: true } } } },
        users: { orderBy: [{ role: 'asc' }, { fullName: 'asc' }], include: { branch: true } },
      },
    });
    if (!org || org.isPlatform) throw new NotFoundException('Бизнес ёфт нашуд');
    const [summary] = await this.withOwners([org]);
    return {
      ...summary,
      branchList: org.branches.map((b) => ({ ...toBranch(b), staffCount: b._count.users })),
      staff: org.users.map((u) => toUser(u)),
    };
  }

  /** Тасдиқ, рад ё бастан — соҳиб огоҳинома мегирад (Telegram + WhatsApp) */
  async decide(actor: Pick<AuthUser, 'id' | 'fullName'>, id: number, decision: Decision, note = ''): Promise<AdminBusiness> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org || org.isPlatform) throw new NotFoundException('Бизнес ёфт нашуд');
    if (!ALLOWED_FROM[decision].includes(org.status)) {
      throw new BadRequestException(`Бизнес аллакай «${ORG_STATUS_LABELS[org.status]}» аст`);
    }
    if (decision !== 'approve' && !note.trim()) throw new BadRequestException('Сабабро нависед');
    const status = NEXT_STATUS[decision];
    // Шарт дар where: агар ду админ якбора пахш кунанд, танҳо яке иҷро мешавад.
    const res = await this.prisma.organization.updateMany({
      where: { id, status: org.status },
      data: { status, statusNote: decision === 'approve' ? '' : note.trim(), reviewedAt: new Date(), reviewedById: actor.id },
    });
    if (!res.count) throw new BadRequestException('Ҳолати бизнес ҳоло тағйир ёфт — саҳифаро нав кунед');
    const updated = await this.prisma.organization.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { branches: true, users: true, products: true } } },
    });
    this.logger.log(`${actor.fullName}: «${org.name}» (#${id}) → ${status}`);
    void this.notifyOwner(updated, note.trim()).catch((e) => this.logger.warn(`Огоҳинома ба соҳиб: ${(e as Error).message}`));
    void this.notifyAdmins(`${decision === 'approve' ? '✅' : '⛔'} <b>${escape(org.name)}</b> (#${id}) — ${ORG_STATUS_LABELS[status]}\nАз ҷониби: ${escape(actor.fullName)}`, actor.id).catch(() => {});
    const [summary] = await this.withOwners([updated]);
    return summary;
  }

  /** Бизнеси нав сабт шуд: ба ҳамаи супер-админҳо ва ба худи соҳиб */
  async onBusinessRegistered(orgId: number) {
    try {
      const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
      const owner = org.ownerId ? await this.prisma.user.findUnique({ where: { id: org.ownerId } }) : null;
      const others = owner ? await this.prisma.organization.count({ where: { ownerId: owner.id, id: { not: org.id } } }) : 0;
      const type = BUSINESS_TYPE_LABELS[org.type as BusinessType] ?? org.type;
      await this.notifyAdmins(
        [
          '🆕 <b>Бизнеси нав сабт шуд — интизори тасдиқ</b>',
          '',
          `🏪 <b>${escape(org.name)}</b> (#${org.id})`,
          `Навъ: ${escape(type)}`,
          owner ? `👤 Соҳиб: ${escape(owner.fullName)}` : '',
          owner ? `📞 ${escape(owner.phone)}` : '',
          owner ? `✉️ ${escape(owner.email)}` : '',
          others ? `Ин соҳиб боз ${others} бизнес дорад` : '',
          '',
          `Тасдиқ: /approve ${org.id}`,
          `Рад: /reject ${org.id} сабаб`,
          'Ҳама дархостҳо: /pending',
        ]
          .filter((l, i, a) => l || a[i - 1])
          .join('\n'),
      );
      if (owner) {
        await this.notifications.notifyUser(
          owner,
          `📝 ${escape(owner.fullName)}, дархости бизнеси <b>${escape(org.name)}</b> қабул шуд.\nСупер-админ онро месанҷад ва тасдиқ мекунад — ба шумо хабар медиҳем.`,
        );
      }
    } catch (e) {
      this.logger.warn(`Огоҳиномаи бизнеси нав (#${orgId}): ${(e as Error).message}`);
    }
  }

  /**
   * Командаҳои бот барои супер-админ (Telegram ва WhatsApp). null — команда барои ин ҷо нест.
   * /pending — рӯйхати дархостҳо; /approve 12; /reject 12 сабаб; /block 12 сабаб; /business 12
   */
  async botCommand(user: User, command: string, args: string[]): Promise<string | null> {
    if (!['/pending', '/approve', '/reject', '/block', '/business', '/admin'].includes(command)) return null;
    if (!user.isSuperAdmin) return 'Ин команда танҳо барои супер-админ аст.';

    if (command === '/pending' || command === '/admin') {
      const rows = await this.list({ status: 'PENDING' });
      if (!rows.length) return '✅ Дархости нав нест.';
      return [
        `🕓 <b>Интизори тасдиқ: ${rows.length}</b>`,
        '',
        ...rows.slice(0, 20).map((b) => `#${b.id} <b>${escape(b.name)}</b> — ${escape(BUSINESS_TYPE_LABELS[b.type] ?? b.type)}${b.owner ? `\n   👤 ${escape(b.owner.fullName)} · ${escape(b.owner.phone)}` : ''}`),
        rows.length > 20 ? `\n… ва боз ${rows.length - 20}` : '',
        '',
        '/approve ID — тасдиқ · /reject ID сабаб — рад · /business ID — маълумот',
      ].join('\n');
    }

    const id = Number(args[0]?.replace('#', ''));
    if (!Number.isInteger(id) || id <= 0) return `Рақами бизнесро нависед, масалан: ${command} 12`;

    if (command === '/business') {
      const b = await this.detail(id).catch(() => null);
      if (!b) return 'Бизнес ёфт нашуд.';
      return [
        `🏪 <b>${escape(b.name)}</b> (#${b.id})`,
        `Ҳолат: ${ORG_STATUS_LABELS[b.status]}${b.statusNote ? ` — ${escape(b.statusNote)}` : ''}`,
        `Навъ: ${escape(BUSINESS_TYPE_LABELS[b.type] ?? b.type)}`,
        b.owner ? `👤 ${escape(b.owner.fullName)} · ${escape(b.owner.phone)} · ${escape(b.owner.email)}` : '',
        `Филиалҳо: ${b.branches} · Кормандон: ${b.employees} · Маҳсулот: ${b.products}`,
        ...b.branchList.slice(0, 15).map((br) => `  • ${escape(br.name)} (${escape(br.city)}) — ${br.staffCount} нафар`),
      ]
        .filter(Boolean)
        .join('\n');
    }

    const decision = command.slice(1) as Decision;
    try {
      const b = await this.decide(user, id, decision, args.slice(1).join(' '));
      return `${decision === 'approve' ? '✅' : '⛔'} <b>${escape(b.name)}</b> — ${ORG_STATUS_LABELS[b.status]}. Ба соҳиб хабар дода шуд.`;
    } catch (e) {
      return `❌ ${escape((e as Error).message)}`;
    }
  }

  // ---------- ёрирасон ----------

  /** Ширкатҳои платформа (ки супер-админ барои худ дорад) дар рӯйхати бизнесҳо нестанд */
  private realBusinesses() {
    return { isPlatform: false };
  }

  private async withOwners(rows: OrgWithCounts[]): Promise<AdminBusiness[]> {
    const ownerIds = [...new Set(rows.map((o) => o.ownerId).filter((x): x is number => !!x))];
    const owners = ownerIds.length ? await this.prisma.user.findMany({ where: { id: { in: ownerIds } } }) : [];
    const counts = ownerIds.length
      ? await this.prisma.organization.groupBy({ by: ['ownerId'], where: { ownerId: { in: ownerIds } }, _count: { _all: true } })
      : [];
    return rows.map((o) => {
      const owner = owners.find((u) => u.id === o.ownerId) ?? null;
      return {
        id: o.id,
        name: o.name,
        type: o.type as BusinessType,
        description: o.description,
        status: o.status,
        statusNote: o.statusNote,
        createdAt: o.createdAt.toISOString(),
        reviewedAt: o.reviewedAt?.toISOString() ?? null,
        owner: owner
          ? { id: owner.id, fullName: owner.fullName, email: owner.email, phone: owner.phone, whatsapp: owner.whatsapp, telegram: owner.telegram, telegramLinked: !!owner.telegramChatId }
          : null,
        branches: o._count.branches,
        employees: o._count.users,
        products: o._count.products,
        ownerBusinesses: Math.max((counts.find((c) => c.ownerId === o.ownerId)?._count._all ?? 1) - 1, 0),
      };
    });
  }

  private async notifyAdmins(text: string, exceptUserId?: number) {
    const admins = await this.prisma.user.findMany({ where: { isSuperAdmin: true, isActive: true, id: exceptUserId ? { not: exceptUserId } : undefined } });
    if (!admins.length) this.logger.warn('Супер-админ нест — огоҳинома фиристода нашуд');
    for (const a of admins.filter((a) => !a.telegramChatId && !a.whatsapp && !a.phone)) {
      this.logger.warn(`${a.email}: на Telegram пайваст аст, на телефон/WhatsApp — огоҳинома намерасад (профил ё SUPERADMIN_PHONE)`);
    }
    await Promise.all(admins.map((a) => this.notifications.notifyUser(a, text)));
  }

  private async notifyOwner(org: Organization, note: string) {
    if (!org.ownerId) return;
    const owner = await this.prisma.user.findUnique({ where: { id: org.ownerId } });
    if (!owner) return;
    const site = process.env.WEB_ORIGIN?.split(',')[0]?.trim();
    const texts: Partial<Record<OrgStatus, string>> = {
      APPROVED: `🎉 Табрик, ${escape(owner.fullName)}! Бизнеси <b>${escape(org.name)}</b> тасдиқ шуд.\nАкнун филиалҳо, кормандон ва маҳсулотро илова кунед.${site ? `\n${site}/login` : ''}`,
      REJECTED: `❌ Дархости бизнеси <b>${escape(org.name)}</b> рад шуд.${note ? `\nСабаб: ${escape(note)}` : ''}`,
      BLOCKED: `⛔ Бизнеси <b>${escape(org.name)}</b> муваққатан баста шуд.${note ? `\nСабаб: ${escape(note)}` : ''}`,
    };
    const text = texts[org.status];
    if (text) await this.notifications.notifyUser(owner, text);
  }
}

// ---------- Controller ----------

@Controller('admin')
@Feature('admin')
@SuperAdmin()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('businesses')
  list(@Query('status') status?: string, @Query('q') q?: string) {
    return this.admin.list({ status: ORG_STATUSES.includes(status as OrgStatus) ? (status as OrgStatus) : undefined, q });
  }

  @Get('businesses/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.admin.detail(id);
  }

  @Post('businesses/:id/approve')
  @HttpCode(200)
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.admin.decide(user, id, 'approve');
  }

  @Post('businesses/:id/reject')
  @HttpCode(200)
  reject(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.admin.decide(user, id, 'reject', dto.note);
  }

  @Post('businesses/:id/block')
  @HttpCode(200)
  block(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.admin.decide(user, id, 'block', dto.note);
  }
}

@Global()
@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
