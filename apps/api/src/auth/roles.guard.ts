import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@filialhub/shared';
import { AuthUser, ROLES_KEY, SUPER_ADMIN } from './decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN, [ctx.getHandler(), ctx.getClass()]) && !user?.isSuperAdmin) {
      throw new ForbiddenException('Ин бахш танҳо барои супер-админ аст');
    }
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Шумо барои ин амал ҳуқуқ надоред');
    }
    return true;
  }
}
