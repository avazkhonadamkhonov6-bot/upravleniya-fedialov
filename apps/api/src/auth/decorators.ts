import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Feature as FeatureName, Position, Role } from '@filialhub/shared';

export interface AuthUser {
  id: number;
  /** Ширкати корбар — ҳамаи маълумот танҳо дар дохили он */
  organizationId: number;
  /** Навъи кори ширкат (BusinessType) */
  businessType: string;
  /** ID-ҳои ҳамаи филиалҳои ширкат */
  branchIds: number[];
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

/** Маршрут танҳо барои мизоҷони онлайн (токени kind: 'client') */
export const CLIENT_ONLY = 'clientOnly';
export const ClientOnly = () => SetMetadata(CLIENT_ONLY, true);

export interface AuthClient {
  id: number;
  fullName: string;
}

export const CurrentClient = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthClient => {
  return ctx.switchToHttp().getRequest().client;
});

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
