import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { canAccess, type Feature } from '@filialhub/shared';
import { AuthUser, FEATURE_KEY, IS_PUBLIC } from './decorators';

/** Кормандон (кассир, официант, ошпаз, фаррош) танҳо ба маршрутҳои саҳифаҳои худ дастрасӣ доранд. */
@Injectable()
export class StaffAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || user.role !== 'STAFF') return true;
    const features = this.reflector.getAllAndOverride<Feature[]>(FEATURE_KEY, targets) ?? [];
    if (!features.some((f) => canAccess(user, f))) {
      throw new ForbiddenException('Ин бахш барои вазифаи шумо кушода нест');
    }
    return true;
  }
}
