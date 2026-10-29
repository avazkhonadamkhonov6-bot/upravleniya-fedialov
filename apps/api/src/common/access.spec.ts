import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators';
import { assertSameOrg, branchIdList, branchWhere, scopeBranch } from './access';

// Ду ширкат: A (филиалҳои 1, 2) ва B (филиали 9). Ҳеҷ кас набояд маълумоти ширкати дигарро бинад.
const base: AuthUser = {
  id: 1,
  organizationId: 100,
  businessType: 'RESTAURANT',
  branchIds: [1, 2],
  role: 'CHEF',
  branchId: null,
  position: null,
  fullName: 'Шеф A',
  isSuperAdmin: false,
  orgStatus: 'APPROVED',
} as AuthUser;

const chefA = base;
const managerA1 = { ...base, id: 2, role: 'MANAGER', branchId: 1 } as AuthUser;
const staffA2 = { ...base, id: 3, role: 'STAFF', branchId: 2, position: 'CASHIER' } as AuthUser;
const loose = { ...base, id: 4, role: 'STAFF', branchId: null } as AuthUser;
const OTHER_ORG_BRANCH = 9;

describe('scopeBranch', () => {
  it('шеф филиали ширкати худро интихоб карда метавонад', () => {
    assert.equal(scopeBranch(chefA, 2), 2);
    assert.equal(scopeBranch(chefA), undefined);
  });

  it('шеф филиали ширкати дигарро гирифта наметавонад', () => {
    assert.throws(() => scopeBranch(chefA, OTHER_ORG_BRANCH), ForbiddenException);
  });

  it('менеҷер ва корманд ҳамеша дар филиали худ мемонанд', () => {
    assert.equal(scopeBranch(managerA1), 1);
    assert.equal(scopeBranch(staffA2, 2), 2);
    assert.throws(() => scopeBranch(managerA1, 2), ForbiddenException);
    assert.throws(() => scopeBranch(staffA2, OTHER_ORG_BRANCH), ForbiddenException);
  });

  it('корманди бе филиал ҳеҷ чизро намебинад', () => {
    assert.throws(() => scopeBranch(loose), ForbiddenException);
  });
});

describe('branchWhere / branchIdList', () => {
  it('бе филиал — танҳо филиалҳои ширкати худ, ҳеҷ гоҳ «ҳама»', () => {
    assert.deepEqual(branchWhere(chefA), { in: [1, 2] });
    assert.deepEqual(branchIdList(chefA), [1, 2]);
  });

  it('филиали мушаххас', () => {
    assert.equal(branchWhere(chefA, 1), 1);
    assert.deepEqual(branchIdList(managerA1), [1]);
  });

  it('шефи ширкати бе филиал рӯйхати холӣ мегирад, на филтри холӣ', () => {
    const empty = { ...chefA, branchIds: [] } as AuthUser;
    assert.deepEqual(branchWhere(empty), { in: [] });
  });
});

describe('assertSameOrg', () => {
  it('сабти ширкати худ — бе хато', () => {
    assert.doesNotThrow(() => assertSameOrg(chefA, 100));
  });

  it('сабти ширкати дигар ё бе ширкат — 403', () => {
    assert.throws(() => assertSameOrg(chefA, 200), ForbiddenException);
    assert.throws(() => assertSameOrg(staffA2, null), ForbiddenException);
    assert.throws(() => assertSameOrg(staffA2, undefined), ForbiddenException);
  });
});
