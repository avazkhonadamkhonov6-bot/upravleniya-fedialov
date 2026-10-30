import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';
import type { DebtsService } from '../debts/debts';
import type { PrismaService } from '../prisma/prisma.service';
import type { StockService } from '../products/stock';
import type { PromosService } from '../promos/promos';
import { CreateOrderDto, OrdersService } from './orders';

const chef = { id: 1, organizationId: 100, branchIds: [1], role: 'CHEF', branchId: null, position: null } as unknown as AuthUser;
const cashier = { ...chef, id: 3, role: 'STAFF', branchId: 1, position: 'CASHIER' } as AuthUser;
const cook = { ...chef, id: 4, role: 'STAFF', branchId: 1, position: 'COOK' } as AuthUser;

const products = [
  { id: 10, price: 100, cost: 60, isActive: true, organizationId: 100 },
  { id: 11, price: 25.5, cost: 10, isActive: true, organizationId: 100 },
];
const customers: Record<number, { organizationId: number; points: number }> = {
  7: { organizationId: 100, points: 40 },
  8: { organizationId: 200, points: 999 }, // мизоҷи ширкати дигар
};

function service(promoDiscount = 0) {
  const prisma = {
    branch: { findUnique: async () => ({ id: 1, isActive: true }) },
    product: { findMany: async ({ where }: { where: { id: { in: number[] }; organizationId: number } }) => products.filter((p) => where.id.in.includes(p.id) && p.organizationId === where.organizationId) },
    customer: { findUnique: async ({ where }: { where: { id: number } }) => customers[where.id] ?? null },
  } as unknown as PrismaService;
  const promos = { check: async (_org: number, code: string) => ({ code, discount: promoDiscount, label: '' }) } as unknown as PromosService;
  return new OrdersService(prisma, {} as StockService, {} as DebtsService, promos);
}

const dto = (d: Partial<CreateOrderDto>): CreateOrderDto => ({ branchId: 1, payment: 'CASH', items: [{ productId: 10, qty: 2 }, { productId: 11, qty: 1 }], ...d }) as CreateOrderDto;

describe('OrdersService.quote — нарх аз база', () => {
  it('ҷамъ ва арзиш аз нархи база ҳисоб мешаванд', async () => {
    const q = await service().quote(chef, dto({}));
    assert.equal(q.subtotal, 225.5);
    assert.equal(q.totalCost, 130);
    assert.equal(q.total, 225.5);
    assert.equal(q.pointsEarned, 0);
  });

  it('промо аввал, баъд бонус; бонус аз баллҳои мизоҷ зиёд намешавад', async () => {
    const q = await service(25.5).quote(chef, dto({ customerId: 7, usePoints: 500, promoCode: 'X' }));
    assert.equal(q.pointsUsed, 40); // мизоҷ танҳо 40 балл дорад
    assert.equal(q.total, 160); // 225.5 − 25.5 − 40
    assert.equal(q.pointsEarned, 8); // 5% аз 160
  });

  it('бонус аз маблағи харид зиёд шуда наметавонад', async () => {
    const q = await service(220).quote(chef, dto({ customerId: 7, usePoints: 40, promoCode: 'X' }));
    assert.equal(q.pointsUsed, 5); // 225.5 − 220 = 5.5 → 5 балл
    assert.equal(q.total, 0.5);
  });

  it('мизоҷи ширкати дигар — хато', async () => {
    await assert.rejects(service().quote(chef, dto({ customerId: 8 })), BadRequestException);
  });

  it('моли ширкати дигар ё ғайрифаъол — хато', async () => {
    await assert.rejects(service().quote(chef, dto({ items: [{ productId: 99, qty: 1 }] })), BadRequestException);
  });

  it('фурӯш ба қарз бе мизоҷ — хато', async () => {
    await assert.rejects(service().quote(chef, dto({ payment: 'DEBT' })), BadRequestException);
  });

  it('бонус бе мизоҷ — хато', async () => {
    await assert.rejects(service().quote(chef, dto({ usePoints: 5 })), BadRequestException);
  });
});

describe('OrdersService.create — қарз танҳо бо тасдиқ', () => {
  it('кассир худаш ба қарз фурӯхта наметавонад', async () => {
    await assert.rejects(service().create(cashier, dto({ payment: 'DEBT', customerId: 7 })), ForbiddenException);
  });

  it('ошпаз умуман фурӯш сабт карда наметавонад', async () => {
    await assert.rejects(service().create(cook, dto({})), ForbiddenException);
  });
});
