import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaService } from '../prisma/prisma.service';
import { BackInStockService } from './back-in-stock.service';
import type { CustomerBotService } from './customer-bot.service';

function setup(chats: { regulars: string[]; online: string[] }, product = { isActive: true }) {
  const sent: { chat: string; text: string }[] = [];
  let call = 0;
  const prisma = {
    product: {
      findUnique: async () => ({ id: 5, name: 'Кола', price: 8, isActive: product.isActive, organizationId: 1, organization: { id: 1, name: 'Дӯкон', isPublic: true, status: 'APPROVED' } }),
    },
    branch: { findUnique: async () => ({ name: 'Марказ', isActive: true }) },
    // Аввал мизоҷони доимӣ (POS), баъд мизоҷони онлайн
    $queryRaw: async () => (call++ % 2 === 0 ? chats.regulars : chats.online).map((chatId) => ({ chatId })),
  } as unknown as PrismaService;
  const bot = { notifyCustomer: async (c: { telegramChatId: string }, text: string) => (sent.push({ chat: c.telegramChatId, text }), true) } as unknown as CustomerBotService;
  return { service: new BackInStockService(prisma, bot), sent };
}

describe('«Моли дӯстдоштаи шумо омад»', () => {
  it('мизоҷони доимӣ ва онлайн як бор хабар мегиранд (такрор — не)', async () => {
    const { service, sent } = setup({ regulars: ['10', '11'], online: ['11', '12'] });
    assert.equal(await service.run(5, 1), 3);
    assert.deepEqual(sent.map((s) => s.chat).sort(), ['10', '11', '12']);
    assert.match(sent[0].text, /«Кола» боз омад/);
  });

  it('дар 7 рӯз дубора не, пас аз 7 рӯз — боз', async () => {
    const { service, sent } = setup({ regulars: ['10'], online: [] });
    const t = Date.now();
    await service.run(5, 1, t);
    await service.run(5, 1, t + 86_400_000);
    assert.equal(sent.length, 1);
    await service.run(5, 1, t + 8 * 86_400_000);
    assert.equal(sent.length, 2);
  });

  it('моли ғайрифаъол — хабар нест', async () => {
    const { service, sent } = setup({ regulars: ['10'], online: [] }, { isActive: false });
    assert.equal(await service.run(5, 1), 0);
    assert.equal(sent.length, 0);
  });
});
