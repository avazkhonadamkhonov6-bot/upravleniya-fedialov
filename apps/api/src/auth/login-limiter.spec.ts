import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { HttpException } from '@nestjs/common';
import { LoginLimiter } from './login-limiter';

const is429 = (e: unknown) => e instanceof HttpException && e.getStatus() === 429;

describe('LoginLimiter', () => {
  afterEach(() => mock.timers.reset());

  it('пас аз 8 кӯшиши нодуруст почта баста мешавад', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 7; i++) l.fail('a@x.tj');
    assert.doesNotThrow(() => l.check('a@x.tj'));
    l.fail('a@x.tj');
    assert.throws(() => l.check('a@x.tj'), is429);
  });

  it('почтаи дигарро намебандад', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 8; i++) l.fail('a@x.tj');
    assert.doesNotThrow(() => l.check('b@x.tj'));
  });

  it('воридшавии дуруст ҳисобро тоза мекунад', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 7; i++) l.fail('a@x.tj');
    l.success('a@x.tj');
    l.fail('a@x.tj');
    assert.doesNotThrow(() => l.check('a@x.tj'));
  });

  it('пас аз 15 дақиқа боз кушода мешавад', () => {
    mock.timers.enable({ apis: ['Date'], now: 0 });
    const l = new LoginLimiter();
    for (let i = 0; i < 8; i++) l.fail('a@x.tj');
    assert.throws(() => l.check('a@x.tj'), is429);
    mock.timers.tick(15 * 60_000 + 1);
    assert.doesNotThrow(() => l.check('a@x.tj'));
  });
});
