import { Injectable, Logger } from '@nestjs/common';
import { formatMoney } from '@filialhub/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerBotService } from './customer-bot.service';

/** Ба як мизоҷ барои як мол на зиёда аз як бор дар ин муддат */
const QUIET_MS = 7 * 86_400_000;
/** Дар як бор на зиёда аз ин қадар паём — бот спам намекунад ва Telegram манъ намекунад */
const MAX_PER_RUN = 200;
/** «Дӯстдошта» — ақаллан ин қадар бор харида шуд */
const MIN_PURCHASES = 2;

/**
 * «Моли дӯстдоштаи шумо омад»: вақте ки мол дар филиал аз 0 боз пайдо мешавад, мизоҷоне, ки онро
 * зуд-зуд мехаранд (POS, ақаллан 2 бор) ё онлайн фармоиш дода буданд, дар Telegram хабар мегиранд.
 * Танҳо Telegram (ройгон); WhatsApp барои паёмҳои оммавӣ рақамро баста мекунад.
 */
@Injectable()
export class BackInStockService {
  private readonly logger = new Logger('BackInStock');
  /** «chatId:productId» → охирин вақти хабар (хотираи процесс; як инстанси API) */
  private readonly sent = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: CustomerBotService,
  ) {}

  /** Пас аз commit-и қабул ё интиқол; хато ҳеҷ гоҳ амали асосиро вайрон намекунад */
  notify(productId: number, branchId: number) {
    void this.run(productId, branchId).catch((e: Error) => this.logger.warn(e.message));
  }

  async run(productId: number, branchId: number, now = Date.now()) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { organization: { select: { id: true, name: true, isPublic: true, status: true } } },
    });
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { name: true, isActive: true } });
    if (!p || !p.isActive || !branch?.isActive) return 0;

    const since = new Date(now - 180 * 86_400_000);
    const [regulars, online] = await Promise.all([
      this.prisma.$queryRaw<{ chatId: string }[]>`
        SELECT DISTINCT c."telegramChatId" AS "chatId"
        FROM "Customer" c
        JOIN "Order" o ON o."customerId" = c.id
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        WHERE c."organizationId" = ${p.organizationId} AND c."telegramChatId" IS NOT NULL
          AND oi."productId" = ${productId} AND oi.qty > 0 AND o."createdAt" >= ${since}
        GROUP BY c.id, c."telegramChatId"
        HAVING COUNT(DISTINCT o.id) >= ${MIN_PURCHASES}`,
      this.prisma.$queryRaw<{ chatId: string }[]>`
        SELECT DISTINCT cl."telegramChatId" AS "chatId"
        FROM "Client" cl
        JOIN "OnlineOrder" o ON o."clientId" = cl.id
        JOIN "OnlineOrderItem" oi ON oi."onlineOrderId" = o.id
        WHERE o."organizationId" = ${p.organizationId} AND cl."telegramChatId" IS NOT NULL
          AND oi."productId" = ${productId} AND o."createdAt" >= ${since}`,
    ]);
    const chats = [...new Set([...regulars, ...online].map((r) => r.chatId))].filter((chat) => now - (this.sent.get(`${chat}:${productId}`) ?? 0) > QUIET_MS);
    if (!chats.length) return 0;

    const site = (process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? '').replace(/\/$/, '');
    const link = site && p.organization.isPublic && p.organization.status === 'APPROVED' ? `\nФармоиш: ${site}/shop/${p.organizationId}` : '';
    const text = `🛍 ${p.organization.name}: «${p.name}» боз омад!\n${branch.name} · ${formatMoney(Number(p.price))}${link}`;
    let n = 0;
    for (const chat of chats.slice(0, MAX_PER_RUN)) {
      this.sent.set(`${chat}:${productId}`, now);
      if (await this.bot.notifyCustomer({ telegramChatId: chat }, text)) n++;
    }
    if (this.sent.size > 50_000) for (const [k, t] of this.sent) if (now - t > QUIET_MS) this.sent.delete(k);
    this.logger.log(`«${p.name}» боз омад: ${n} мизоҷ хабар гирифт`);
    return n;
  }
}
