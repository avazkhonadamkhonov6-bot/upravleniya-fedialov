import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthClient, AuthUser, CLIENT_ONLY, IS_PUBLIC } from './decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Лутфан ворид шавед');

    let payload: { sub: number; kind?: 'client' };
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
      req.client = { id: client.id, fullName: client.fullName } satisfies AuthClient;
      return true;
    }

    // Ҳар дафъа аз база мегирем — то корманди ғайрифаъол ё нақши тағйирёфта фавран таъсир кунад.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: { include: { branches: { select: { id: true } } } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Ҳисоб ғайрифаъол аст');

    const authUser: AuthUser = {
      id: user.id,
      organizationId: user.organizationId,
      businessType: user.organization.type,
      branchIds: user.organization.branches.map((b) => b.id),
      role: user.role,
      branchId: user.branchId,
      position: user.position,
      fullName: user.fullName,
    };
    req.user = authUser;
    return true;
  }
}
