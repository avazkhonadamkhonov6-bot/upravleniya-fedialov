import type { BusinessType, Branch as BranchDto, Client as ClientDto, Organization as OrganizationDto, Product as ProductDto, User as UserDto } from '@filialhub/shared';
import type { Branch, Client, Organization, Product, User } from '../generated/prisma/client';

type UserWithBranch = User & { branch?: Pick<Branch, 'id' | 'name' | 'city'> | null; organization?: Organization | null };

export function toClient(c: Client): ClientDto {
  return { id: c.id, fullName: c.fullName, email: c.email, phone: c.phone, address: c.address, createdAt: c.createdAt.toISOString() };
}

export function toOrganization(o: Organization): OrganizationDto {
  return {
    id: o.id,
    name: o.name,
    type: o.type as BusinessType,
    description: o.description,
    isPublic: o.isPublic,
    status: o.status,
    statusNote: o.statusNote,
    createdAt: o.createdAt.toISOString(),
  };
}

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
    isSuperAdmin: u.isSuperAdmin,
    organization: u.organization ? toOrganization(u.organization) : undefined,
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
    unit: p.unit,
    price,
    cost,
    profit: Math.round(profit * 100) / 100,
    margin: hideCost || price === 0 ? 0 : Math.round((profit / price) * 1000) / 10,
    barcode: p.barcode,
    isActive: p.isActive,
  };
}
