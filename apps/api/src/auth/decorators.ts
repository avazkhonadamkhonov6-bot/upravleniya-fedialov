import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Position, Role } from '@filialhub/shared';

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

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
