import type { Branch as BranchDto, Product as ProductDto, User as UserDto } from '@filialhub/shared';
import type { Branch, Product, User } from '../generated/prisma/client';

type UserWithBranch = User & { branch?: Pick<Branch, 'id' | 'name' | 'city'> | null };

export function toUser(u: UserWithBranch): UserDto {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    whatsapp: u.whatsapp,
    telegram: u.telegram,
    role: u.role,
    position: u.position,
    branchId: u.branchId,
    branch: u.branch ? { id: u.branch.id, name: u.branch.name, city: u.branch.city } : null,
    salary: u.salary,
    payDay: u.payDay,
    hiredAt: u.hiredAt.toISOString(),
    isActive: u.isActive,
    telegramLinked: !!u.telegramChatId,
  };
}

export function toBranch(b: Branch): BranchDto {
  return {
    id: b.id,
    name: b.name,
    city: b.city,
    address: b.address,
    phone: b.phone,
    email: b.email,
    openedAt: b.openedAt.toISOString(),
    isActive: b.isActive,
  };
}

export function toProduct(p: Product, hideCost = false): ProductDto {
  const price = Number(p.price);
  const cost = hideCost ? 0 : Number(p.cost);
  const profit = hideCost ? 0 : price - cost;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    emoji: p.emoji,
    price,
    cost,
    profit: Math.round(profit * 100) / 100,
    margin: hideCost || price === 0 ? 0 : Math.round((profit / price) * 1000) / 10,
    isActive: p.isActive,
  };
}
