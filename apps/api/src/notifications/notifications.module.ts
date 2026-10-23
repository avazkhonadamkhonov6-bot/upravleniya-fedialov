import { Global, Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { IntegrationsController } from './integrations.controller';
import { NotificationsService } from './notifications.service';
import { ReportService } from './report.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramService } from './telegram.service';
import { WhatsAppService } from './whatsapp.service';

@Global()
@Module({
  imports: [StatsModule],
  controllers: [IntegrationsController],
  providers: [TelegramService, WhatsAppService, NotificationsService, ReportService, TelegramBotService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
