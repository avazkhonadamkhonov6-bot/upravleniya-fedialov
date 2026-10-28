import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { IntegrationStatus } from '@filialhub/shared';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { ReportService } from './report.service';
import { TelegramService } from './telegram.service';
import { WhatsAppService } from './whatsapp.service';

@Controller('integrations')
@Roles('CHEF')
export class IntegrationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsAppService,
    private readonly reports: ReportService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: AuthUser): Promise<IntegrationStatus> {
    return {
      telegram: {
        configured: this.telegram.configured,
        botUsername: this.telegram.botUsername,
        linkedUsers: await this.prisma.user.count({ where: { telegramChatId: { not: null }, organizationId: user.organizationId } }),
        mode: this.telegram.mode,
        lastError: this.telegram.lastError,
      },
      whatsapp: {
        configured: this.whatsapp.configured,
        template: this.whatsapp.template,
        webhook: !!process.env.WHATSAPP_VERIFY_TOKEN?.trim(),
        lastError: this.whatsapp.lastError,
      },
      dailyReportCron: process.env.DAILY_REPORT_CRON || '0 0 22 * * *',
    };
  }

  @Get('logs')
  async logs(@CurrentUser() user: AuthUser) {
    // Танҳо паёмҳои одамони ҳамин ширкат
    const people = (await this.prisma.user.findMany({ where: { organizationId: user.organizationId }, select: { id: true } })).map((u) => u.id);
    const rows = await this.prisma.notification.findMany({
      where: { OR: [{ organizationId: user.organizationId }, { userId: { in: people } }, { senderId: { in: people } }] },
      orderBy: { id: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  /** Ҳисоботи имрӯзро фавран ба худи шеф мефиристад (барои санҷиш). */
  @Post('test-report')
  @HttpCode(200)
  async testReport(@CurrentUser() user: AuthUser) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const text = await this.reports.buildReport('day', me);
    await this.notifications.notifyUser(me, text);
    return { text };
  }

  /** Ҳисоботи рӯзонаро ба шефҳо ва менеҷерҳои ҳамин ширкат мефиристад. */
  @Post('daily-report')
  @HttpCode(200)
  async dailyReport(@CurrentUser() user: AuthUser) {
    const sent = await this.reports.sendDailyReports(user.organizationId);
    return { recipients: sent };
  }
}
