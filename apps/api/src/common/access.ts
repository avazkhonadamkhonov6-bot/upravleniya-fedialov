import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';

/**
 * Як филиали мушаххас, ки корбар бо он кор карда метавонад (барои сохтан/тағйир додан).
 * Шеф: филиали дархостшуда (бояд аз ширкати худаш бошад) ё undefined. Менеҷер/корманд: ҳамеша филиали худаш.
 */
export function scopeBranch(user: AuthUser, requested?: number): number | undefined {
  if (user.role === 'CHEF') {
    if (requested && !user.branchIds.includes(requested)) {
      throw new ForbiddenException('Ин филиал ба ширкати шумо тааллуқ надорад');
    }
    return requested || undefined;
  }
  if (!user.branchId) throw new ForbiddenException('Шумо ба ягон филиал вобаста нестед');
  if (requested && requested !== user.branchId) {
    throw new ForbiddenException('Шумо танҳо филиали худатонро дида метавонед');
  }
  return user.branchId;
}

/**
 * Филтр барои Prisma `where: { branchId: … }`: филиали дархостшуда ё ҳамаи филиалҳои ширкати шеф.
 * Ҳеҷ гоҳ undefined намедиҳад — то маълумоти ширкати дигар ба рӯйхат наояд.
 */
export function branchWhere(user: AuthUser, requested?: number): number | { in: number[] } {
  return scopeBranch(user, requested) ?? { in: user.branchIds };
}

/** Рӯйхати ID-ҳои филиал барои SQL-и хом (`"branchId" = ANY(...)`). */
export function branchIdList(user: AuthUser, requested?: number): number[] {
  const b = scopeBranch(user, requested);
  return b ? [b] : user.branchIds;
}

/** Санҷиш, ки сабт (корбар, мизоҷ, маҳсулот…) ба ширкати корбар тааллуқ дорад. */
export function assertSameOrg(user: AuthUser, organizationId: number | null | undefined, message = 'Ёфт нашуд') {
  if (organizationId !== user.organizationId) throw new ForbiddenException(message);
}
