import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { issuedBeforePasswordChange } from './jwt-auth.guard';

describe('Пас аз ивази парол сессияҳои кӯҳна бекор мешаванд', () => {
  const changed = new Date('2026-11-04T12:00:00.700Z');
  const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

  it('парол ҳеҷ гоҳ иваз нашудааст — токен қабул', () => {
    assert.equal(issuedBeforePasswordChange(sec('2020-01-01T00:00:00Z'), null), false);
  });

  it('токени пеш аз ивази парол — рад', () => {
    assert.equal(issuedBeforePasswordChange(sec('2026-11-04T11:59:59Z'), changed), true);
  });

  it('токени нав дар ҳамон сония — қабул (дастгоҳе, ки паролро иваз кард, намебарояд)', () => {
    assert.equal(issuedBeforePasswordChange(sec('2026-11-04T12:00:00Z'), changed), false);
  });

  it('токени бе iat — рад', () => {
    assert.equal(issuedBeforePasswordChange(undefined, changed), true);
  });
});
