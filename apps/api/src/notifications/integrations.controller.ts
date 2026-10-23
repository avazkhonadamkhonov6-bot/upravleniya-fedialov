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
  async status(): Promise<IntegrationStatus> {
    return {
      telegram: {
        configured: this.telegram.configured,
        botUsername: this.telegram.botUsername,
        linkedUsers: await this.prisma.user.count({ where: { telegramChatId: { not: null } } }),
      },
      whatsapp: { configured: this.whatsapp.configured },
      dailyReportCron: process.env.DAILY_REPORT_CRON || '0 0 22 * * *',
    };
  }

  @Get('logs')
  async logs() {
    const rows = await this.prisma.notification.findMany({ orderBy: { id: 'desc' }, take: 50 });
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  /** Ҳисоботи имрӯзро фавран ба худи шеф мефиристад (барои санҷиш). */
  @Post('test-report')
  @HttpCode(200)
  async testReport(@CurrentUser() user: AuthUser) {
    const text = await this.reports.buildReport('day');
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await this.notifications.notifyUser(me, text);
    return { text };
  }

  /** Ҳисоботи рӯзонаро ба ҳамаи шефҳо ва менеҷерҳо мефиристад. */
  @Post('daily-report')
  @HttpCode(200)
  async dailyReport() {
    const sent = await this.reports.sendDailyReports();
    return { recipients: sent };
  }
}
