import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { TelegramService } from '../notifications/telegram.service';
import type { WhatsAppService } from '../notifications/whatsapp.service';
import type { PrismaService } from '../prisma/prisma.service';
import { FORGOT_REPLY, PasswordResetService } from './password-reset';

function setup(user: { telegramChatId: string | null; isActive?: boolean; demoOrg?: boolean } | null = { telegramChatId: '555' }) {
  const sent: string[] = [];
  const saved: { passwordHash?: string } = {};
  const prisma = {
    user: {
      findUnique: async () => (user ? { id: 7, isActive: user.isActive ?? true, telegramChatId: user.telegramChatId, whatsapp: '', phone: '', organizationId: 1 } : null),
      update: async ({ data }: { data: { passwordHash: string } }) => Object.assign(saved, data),
    },
    organization: { count: async () => (user?.demoOrg ? 1 : 0) },
    client: { findUnique: async () => null },
  } as unknown as PrismaService;
  const telegram = { send: async (_: string, text: string) => (sent.push(text), { status: 'SENT' }) } as unknown as TelegramService;
  const whatsapp = { send: async () => ({ status: 'DRY_RUN' }) } as unknown as WhatsAppService;
  const service = new PasswordResetService(prisma, telegram, whatsapp);
  const code = () => /Коди шумо: <b>(\d{6})<\/b>/.exec(sent.at(-1) ?? '')?.[1] ?? '';
  return { service, sent, saved, code };
}

describe('Паролро фаромӯш кардам', () => {
  it('код ба Telegram меравад ва парол иваз мешавад', async () => {
    const { service, code, saved } = setup();
    assert.deepEqual(await service.forgot('Ali@Shop.tj'), FORGOT_REPLY);
    assert.match(code(), /^\d{6}$/);
    await service.reset('ali@shop.tj', code(), 'nav-parol-123');
    assert.ok(await bcrypt.compare('nav-parol-123', saved.passwordHash!));
  });

  it('код дар сатри аввали паём нест (лог-и dry-run танҳо сатри аввалро менависад)', async () => {
    const { service, sent, code } = setup();
    await service.forgot('ali@shop.tj');
    assert.ok(!sent[0].split('\n')[0].includes(code()));
  });

  it('коди нодуруст — хато; пас аз 5 кӯшиш ҳатто коди дуруст қабул намешавад', async () => {
    const { service, code } = setup();
    await service.forgot('ali@shop.tj');
    const right = code();
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await assert.rejects(service.reset('ali@shop.tj', wrong, 'nav-parol-123'), BadRequestException);
    await assert.rejects(service.reset('ali@shop.tj', right, 'nav-parol-123'), BadRequestException);
  });

  it('код як бор кор мекунад', async () => {
    const { service, code } = setup();
    await service.forgot('ali@shop.tj');
    const c = code();
    await service.reset('ali@shop.tj', c, 'nav-parol-123');
    await assert.rejects(service.reset('ali@shop.tj', c, 'boz-parol-456'), BadRequestException);
  });

  it('ҳисоби демо ва почтаи номаълум — ҳамон ҷавоб, паём намеравад', async () => {
    const demo = setup();
    assert.deepEqual(await demo.service.forgot('chef@filialhub.tj'), FORGOT_REPLY);
    assert.equal(demo.sent.length, 0);
    const none = setup(null);
    assert.deepEqual(await none.service.forgot('kas@nest.tj'), FORGOT_REPLY);
    assert.equal(none.sent.length, 0);
  });

  it('дар 15 дақиқа на зиёда аз 3 код', async () => {
    const { service, sent } = setup();
    for (let i = 0; i < 5; i++) await service.forgot('ali@shop.tj');
    assert.equal(sent.length, 3);
  });

  it('ҳар корманди ширкати демо (масалан менеҷер) — код намеравад', async () => {
    const { service, sent } = setup({ telegramChatId: '555', demoOrg: true });
    await service.forgot('manager1@filialhub.tj');
    assert.equal(sent.length, 0);
  });

  it('корманди ғайрифаъол код намегирад', async () => {
    const { service, sent } = setup({ telegramChatId: '555', isActive: false });
    await service.forgot('ali@shop.tj');
    assert.equal(sent.length, 0);
  });
});
