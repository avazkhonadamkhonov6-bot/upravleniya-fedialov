import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Feature as FeatureName, Position, Role } from '@filialhub/shared';

export interface AuthUser {
  id: number;
  role: Role;
  branchId: number | null;
  position: Position | null;
  fullName: string;
}

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Ин маршрут ба кадом саҳифа(ҳо) тааллуқ дорад. Корманд (STAFF) маршрутро танҳо он гоҳ мекушояд,
 * ки ақаллан яке аз ин саҳифаҳо барои вазифаи ӯ кушода бошад. Маршрут бе @Feature барои корманд баста аст.
 */
export const FEATURE_KEY = 'feature';
export const Feature = (...features: FeatureName[]) => SetMetadata(FEATURE_KEY, features);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
