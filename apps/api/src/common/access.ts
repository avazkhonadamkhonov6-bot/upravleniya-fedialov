import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';

/**
 * Филиалеро муайян мекунад, ки корбар дида метавонад.
 * Шеф: филиали дархостшуда ё ҳама (undefined). Менеҷер/корманд: ҳамеша филиали худаш.
 */
export function scopeBranch(user: AuthUser, requested?: number): number | undefined {
  if (user.role === 'CHEF') return requested || undefined;
  if (!user.branchId) throw new ForbiddenException('Шумо ба ягон филиал вобаста нестед');
  if (requested && requested !== user.branchId) {
    throw new ForbiddenException('Шумо танҳо филиали худатонро дида метавонед');
  }
  return user.branchId;
}
