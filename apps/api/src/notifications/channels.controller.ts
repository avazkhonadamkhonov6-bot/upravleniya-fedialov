import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import type { DeliveryStatus, TelegramLinkInfo } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { telegramLinkCode } from './telegram-link';
import { TelegramService } from './telegram.service';
import { WhatsAppService } from './whatsapp.service';

/** Профил → «WhatsApp ва Telegram»: пайвасти Telegram бо як пахш ва паёми санҷишӣ ба худ. Ҳар корбар — танҳо барои худаш. */
@Controller('auth/channels')
@Feature('profile')
export class ChannelsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsAppService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async status(@CurrentUser() actor: AuthUser): Promise<{ telegram: TelegramLinkInfo; whatsapp: { configured: boolean; number: string } }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    const bot = this.telegram.botUsername;
    return {
      telegram: {
        configured: this.telegram.configured,
        botUsername: bot,
        link: bot ? `https://t.me/${bot}?start=${telegramLinkCode(user.id)}` : null,
        linked: !!user.telegramChatId,
      },
      whatsapp: { configured: this.whatsapp.configured, number: user.whatsapp || user.phone },
    };
  }

  @Delete('telegram')
  async unlinkTelegram(@CurrentUser() actor: AuthUser) {
    await this.prisma.user.update({ where: { id: actor.id }, data: { telegramChatId: null } });
    return { ok: true };
  }

  /** Паёми санҷишӣ ба Telegram ва WhatsApp-и худи корбар — барои санҷидани он, ки паёмҳо мерасанд. */
  @Post('test')
  @HttpCode(200)
  async test(@CurrentUser() actor: AuthUser): Promise<{ channel: 'TELEGRAM' | 'WHATSAPP'; status: DeliveryStatus; error?: string }[]> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    return this.notifications.sendDirect(
      user.id,
      user,
      `✅ <b>FilialHub</b>: паёми санҷишӣ. Агар инро мебинед — паёмҳо аз сайт ба шумо мерасанд.`,
      ['TELEGRAM', 'WHATSAPP'],
    );
  }
}
