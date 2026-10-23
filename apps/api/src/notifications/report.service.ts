import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { formatMoney, PERIOD_LABELS, type Period } from '@filialhub/shared';
import { localDateKey, periodStart, TZ } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { escape, NotificationsService } from './notifications.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger('DailyReport');

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Матни ҳисобот: branchId холӣ — ҳамаи филиалҳо (барои шеф). */
  async buildReport(period: Period, branchId?: number): Promise<string> {
    const s = await this.stats.periodStats(branchId, periodStart(period));
    const title = PERIOD_LABELS[period].toLowerCase();
    const lines = [`📊 <b>Ҳисобот — ${title}</b> (${localDateKey(new Date())})`];

    if (branchId) {
      const b = await this.prisma.branch.findUnique({ where: { id: branchId } });
      lines.push(`🏪 ${escape(b?.name ?? '')}`);
    }
    lines.push(
      '',
      `💰 Фурӯш: <b>${formatMoney(s.revenue)}</b>`,
      `📈 Фоида: <b>${formatMoney(s.profit)}</b>`,
      `🧾 Фармоишҳо: ${s.orders}`,
      `💳 Чеки миёна: ${formatMoney(s.avgCheck)}`,
    );

    if (!branchId) {
      const ranking = await this.stats.branchRanking(period);
      lines.push('', '<b>Филиалҳо (аз рӯи фоида):</b>');
      ranking.forEach((r, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] ?? '▫️';
        lines.push(`${medal} ${escape(r.name)} — ${formatMoney(r.revenue)} / фоида ${formatMoney(r.profit)}`);
      });
    }
    return lines.join('\n');
  }

  @Cron(process.env.DAILY_REPORT_CRON || '0 0 22 * * *', { name: 'daily-report', timeZone: TZ })
  async sendDailyReports() {
    this.logger.log('Фиристодани ҳисоботи рӯзона…');
    const recipients = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['CHEF', 'MANAGER'] } },
    });
    for (const u of recipients) {
      const text = await this.buildReport('day', u.role === 'CHEF' ? undefined : (u.branchId ?? undefined));
      await this.notifications.notifyUser(u, text);
    }
    return recipients.length;
  }
}
