import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppThrottlerGuard } from './throttle';

const guard = Object.create(AppThrottlerGuard.prototype) as { getTracker(req: object): Promise<string> };

describe('AppThrottlerGuard — калиди ҳудуд', () => {
  it('корбари воридшуда аз рӯи токен, на IP', async () => {
    const a = await guard.getTracker({ headers: { authorization: 'Bearer aaa', 'x-forwarded-for': '1.1.1.1' }, ip: '10.0.0.1' });
    const b = await guard.getTracker({ headers: { authorization: 'Bearer bbb', 'x-forwarded-for': '1.1.1.1' }, ip: '10.0.0.1' });
    assert.notEqual(a, b);
    assert.ok(a.startsWith('t:'));
    assert.ok(!a.includes('aaa')); // худи токен дар хотира намемонад
  });

  it('меҳмон — IP-и аввал аз x-forwarded-for (паси прокси)', async () => {
    assert.equal(await guard.getTracker({ headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.2' }, ip: '10.0.0.1' }), 'ip:5.6.7.8');
    assert.equal(await guard.getTracker({ headers: {}, ip: '10.0.0.1' }), 'ip:10.0.0.1');
  });
});
