import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BillingService } from '../billing/billing';
import { PrismaService } from '../prisma/prisma.service';
import { ALLOW_PENDING, AuthClient, AuthUser, CLIENT_ONLY, IS_PUBLIC } from './decorators';
import { DEMO_BLOCKED_MESSAGE, DEMO_CLIENT_EMAIL, isDemoBlocked } from './demo-guard';

export const LOCKED_MESSAGE = 'Тарифи бизнес тамом шуд — то пардохт ҳисоби шумо баста аст. Ба соҳиби бизнес гӯед, ки тарифро дароз кунад.';

export const PASSWORD_CHANGED = 'Парол иваз шуд — бо пароли нав дубора ворид шавед';

/**
 * Токен пеш аз ивази парол дода шуда буд (дастгоҳи кӯҳна, телефони гумшуда) — рад.
 * JWT вақтро бо сония медиҳад: токени нав дар ҳамон сонияи ивази парол қабул мешавад.
 */
export function issuedBeforePasswordChange(iat: number | undefined, changedAt: Date | null) {
  if (!changedAt) return false;
  return (iat ?? 0) < Math.floor(changedAt.getTime() / 1000);
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Лутфан ворид шавед');

    let payload: { sub: number; kind?: 'client'; iat?: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Сессия тамом шуд, дубора ворид шавед');
    }

    // Мизоҷи онлайн: танҳо маршрутҳои @ClientOnly; ба бахши кормандон роҳ надорад.
    const clientOnly = this.reflector.getAllAndOverride<boolean>(CLIENT_ONLY, [ctx.getHandler(), ctx.getClass()]);
    if (payload.kind === 'client' || clientOnly) {
      if (payload.kind !== 'client') throw new ForbiddenException('Ин бахш барои мизоҷон аст');
      if (!clientOnly) throw new ForbiddenException('Ин бахш барои кормандони ширкат аст');
      const client = await this.prisma.client.findUnique({ where: { id: payload.sub } });
      if (!client) throw new UnauthorizedException('Ҳисоб ёфт нашуд');
      if (issuedBeforePasswordChange(payload.iat, client.passwordChangedAt)) throw new UnauthorizedException(PASSWORD_CHANGED);
      if (client.email === DEMO_CLIENT_EMAIL && isDemoBlocked(req.method, req.path, req.body)) throw new ForbiddenException(DEMO_BLOCKED_MESSAGE);
      req.client = { id: client.id, fullName: client.fullName } satisfies AuthClient;
      return true;
    }

    // Ҳар дафъа аз база мегирем — то корманди ғайрифаъол ё нақши тағйирёфта фавран таъсир кунад.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: { include: { branches: { select: { id: true } } } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Ҳисоб ғайрифаъол аст');
    if (issuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) throw new UnauthorizedException(PASSWORD_CHANGED);
    // Тарифи бизнес тамом шуд ва корманд аз ҳадди ройгон берун монд (кеш — база ҳар дафъа пурсида намешавад)
    if (!user.isSuperAdmin && (await this.billing.isLocked(user, user.organization))) throw new UnauthorizedException(LOCKED_MESSAGE);
    // Демо барои ҳама кушода аст — нест кардан, ивази парол ва танзимҳо хомӯшанд
    if (!user.isSuperAdmin && isDemoBlocked(req.method, req.path, req.body) && (await this.billing.isDemoOrg(user.organizationId))) {
      throw new ForbiddenException(DEMO_BLOCKED_MESSAGE);
    }

    const authUser: AuthUser = {
      id: user.id,
      organizationId: user.organizationId,
      businessType: user.organization.type,
      branchIds: user.organization.branches.map((b) => b.id),
      role: user.role,
      branchId: user.branchId,
      position: user.position,
      fullName: user.fullName,
      isSuperAdmin: user.isSuperAdmin,
      orgStatus: user.organization.status,
    };
    req.user = authUser;

    // Бизнеси тасдиқнашуда (интизор, радшуда ё басташуда): танҳо профил ва рӯйхати бизнесҳо.
    // Супер-админ ҳамеша дастрасӣ дорад.
    if (!user.isSuperAdmin && user.organization.status !== 'APPROVED') {
      const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING, [ctx.getHandler(), ctx.getClass()]);
      if (!allowPending) {
        throw new ForbiddenException(
          user.organization.status === 'PENDING' ? 'Бизнеси шумо интизори тасдиқи супер-админ аст' : 'Бизнеси шумо баста аст. Ба супер-админ муроҷиат кунед',
        );
      }
    }
    return true;
  }
}
