import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDemoBlocked } from './demo-guard';

test('демо: хондан ва фурӯш мумкин', () => {
  assert.equal(isDemoBlocked('GET', '/api/users', undefined), false);
  assert.equal(isDemoBlocked('POST', '/api/orders', { payment: 'CASH', items: [] }), false);
  assert.equal(isDemoBlocked('PATCH', '/api/users/5', { salary: 3000 }), false);
  assert.equal(isDemoBlocked('PATCH', '/api/branches/1', { name: 'Марказ', email: 'b@x.tj' }), false);
  assert.equal(isDemoBlocked('PATCH', '/api/customers/3', { email: 'c@x.tj' }), false);
  assert.equal(isDemoBlocked('POST', '/api/users', { fullName: 'Нав', email: 'new@x.tj', password: 'test12345' }), false);
});

test('демо: нест кардан, парол, почта ва танзимҳо баста', () => {
  assert.equal(isDemoBlocked('DELETE', '/api/branches/1', undefined), true);
  assert.equal(isDemoBlocked('PATCH', '/api/auth/me', { newPassword: 'x', currentPassword: 'demo1234' }), true);
  assert.equal(isDemoBlocked('PATCH', '/api/users/5', { email: 'me@x.tj' }), true);
  assert.equal(isDemoBlocked('PATCH', '/api/users/5', { isActive: false }), true);
  assert.equal(isDemoBlocked('PATCH', '/api/auth/organization', { name: 'Вайрон' }), true);
  assert.equal(isDemoBlocked('PATCH', '/api/shop/me', { newPassword: 'x' }), true);
  assert.equal(isDemoBlocked('POST', '/api/integrations/telegram', {}), true);
});
