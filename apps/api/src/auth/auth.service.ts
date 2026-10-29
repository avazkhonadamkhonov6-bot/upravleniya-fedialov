import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { normalizeTelegram } from '@filialhub/shared';
import { toClient, toOrganization, toUser } from '../common/serializers';
import { AdminService } from '../admin/admin';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './decorators';
import { CreateBusinessDto, LoginDto, RegisterClientDto, RegisterDto, UpdateMeDto, UpdateOrganizationDto } from './dto';

/** Почтаҳои супер-админ аз .env (SUPERADMIN_EMAILS, бо вергул) */
export function isSuperAdminEmail(email: string): boolean {
  return (process.env.SUPERADMIN_EMAILS ?? process.env.SUPERADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly admin: AdminService,
  ) {}

  /** Як даромадан барои ҳама: аввал шеф/кормандон, баъд мизоҷони онлайн. */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { branch: true, organization: true },
    });
    if (!user) {
      const client = await this.prisma.client.findUnique({ where: { email } });
      if (!client || !(await bcrypt.compare(dto.password, client.passwordHash))) {
        throw new UnauthorizedException('Почта ё парол нодуруст аст');
      }
      return { kind: 'client' as const, token: await this.clientToken(client.id), client: toClient(client) };
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Почта ё парол нодуруст аст');
    }
    if (!user.isActive) throw new UnauthorizedException('Ҳисоби шумо ғайрифаъол аст');
    // Почта дар SUPERADMIN_EMAILS — ҳангоми воридшавӣ худкор супер-админ мешавад (бе аз нав сар кардани сервер)
    const me = !user.isSuperAdmin && isSuperAdminEmail(email)
      ? await this.prisma.user.update({ where: { id: user.id }, data: { isSuperAdmin: true }, include: { branch: true, organization: true } })
      : user;
    const token = await this.jwt.signAsync({ sub: me.id, role: me.role });
    return { kind: 'staff' as const, token, user: toUser(me) };
  }

  private clientToken(id: number) {
    return this.jwt.signAsync({ sub: id, kind: 'client' }, { expiresIn: '30d' });
  }

  private async emailTaken(email: string) {
    return !!((await this.prisma.user.findUnique({ where: { email } })) || (await this.prisma.client.findUnique({ where: { email } })));
  }

  /** Мизоҷи онлайн: худаш сабти ном мекунад ва аз ҳар мағоза фармоиш медиҳад. */
  async registerClient(dto: RegisterClientDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.emailTaken(email)) throw new ConflictException('Ин почтаи электронӣ аллакай истифода шудааст');
    const client = await this.prisma.client.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone.trim(),
        address: dto.address?.trim() ?? '',
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
    });
    return { kind: 'client' as const, token: await this.clientToken(client.id), client: toClient(client) };
  }

  /** Бизнесҳои шеф (ҳамаашон ба ӯ тааллуқ доранд) */
  async businesses(actor: AuthUser) {
    const rows = await this.prisma.organization.findMany({
      where: { OR: [{ ownerId: actor.id }, { id: actor.organizationId }] },
      orderBy: { id: 'asc' },
    });
    return rows.map((o) => ({ ...toOrganization(o), current: o.id === actor.organizationId }));
  }

  /** Бизнеси нав барои ҳамон шеф — фавран ба он мегузарад; то тасдиқи супер-админ интизор мемонад */
  async createBusiness(actor: AuthUser, dto: CreateBusinessDto) {
    const org = await this.prisma.organization.create({ data: { name: dto.name.trim(), type: dto.type, ownerId: actor.id, status: 'PENDING' } });
    void this.admin.onBusinessRegistered(org.id);
    return this.switchBusiness(actor, org.id);
  }

  async switchBusiness(actor: AuthUser, organizationId: number) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || (org.ownerId !== actor.id && org.id !== actor.organizationId)) {
      throw new ForbiddenException('Ин бизнес ба шумо тааллуқ надорад');
    }
    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data: { organizationId: org.id, branchId: null },
      include: { branch: true, organization: true },
    });
    return toUser(user);
  }

  /** Соҳибкори нав: ширкат ва ҳисоби шеф якҷоя сохта мешаванд. */
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const superAdmin = isSuperAdminEmail(email);
    // Почтаи супер-админ дар ҳисоби мизоҷи бозор: почтаро аз он ҷудо мекунем (ҳисоб ва фармоишҳояш боқӣ мемонанд)
    if (superAdmin) {
      const client = await this.prisma.client.findUnique({ where: { email } });
      if (client) await this.prisma.client.update({ where: { id: client.id }, data: { email: `${email}.old-client-${client.id}` } });
    }
    if (await this.emailTaken(email)) {
      throw new ConflictException('Ин почтаи электронӣ аллакай истифода шудааст');
    }
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone.trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: 'CHEF',
        isSuperAdmin: superAdmin,
        // Бизнеси супер-админ тасдиқ лозим надорад
        organization: { create: { name: dto.businessName.trim(), type: dto.businessType, status: superAdmin ? 'APPROVED' : 'PENDING' } },
      },
      include: { branch: true, organization: true },
    });
    await this.prisma.organization.update({ where: { id: user.organizationId }, data: { ownerId: user.id } });
    // Бизнеси нав то тасдиқи супер-админ кор намекунад — ба супер-админ ва соҳиб хабар медиҳем.
    if (!superAdmin) void this.admin.onBusinessRegistered(user.organizationId);
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { kind: 'staff' as const, token, user: toUser(user) };
  }

  async organization(organizationId: number) {
    return toOrganization(await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }));
  }

  async updateOrganization(organizationId: number, dto: UpdateOrganizationDto) {
    const o = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { name: dto.name?.trim(), type: dto.type, description: dto.description?.trim(), isPublic: dto.isPublic },
    });
    return toOrganization(o);
  }

  async me(id: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { branch: true, organization: true } });
    return toUser(user);
  }

  async updateMe(id: number, dto: UpdateMeDto) {
    const data: { fullName?: string; email?: string; phone?: string; whatsapp?: string; telegram?: string; passwordHash?: string } = {};
    if (dto.fullName) data.fullName = dto.fullName.trim();
    if (dto.phone) data.phone = dto.phone.trim();
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp.trim();
    if (dto.telegram !== undefined) data.telegram = normalizeTelegram(dto.telegram);

    const current = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const email = dto.email?.toLowerCase().trim();
    const emailChanged = !!email && email !== current.email;
    // Почта ва парол — маълумоти воридшавӣ: барои ивазашон пароли ҳозира лозим аст.
    if (emailChanged || dto.newPassword) {
      if (!dto.currentPassword || !(await bcrypt.compare(dto.currentPassword, current.passwordHash))) {
        throw new BadRequestException('Пароли ҳозира нодуруст аст');
      }
    }
    if (emailChanged) {
      if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Ин почтаи электронӣ аллакай истифода шудааст');
      data.email = email;
    }
    if (dto.newPassword) data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const user = await this.prisma.user.update({ where: { id }, data, include: { branch: true, organization: true } });
    return toUser(user);
  }
}
