import { Global, Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { ChatService } from './chat.service';
import { IntegrationsController } from './integrations.controller';
import { NotificationsService } from './notifications.service';
import { ReportService } from './report.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramService } from './telegram.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppService } from './whatsapp.service';

@Global()
@Module({
  imports: [StatsModule],
  controllers: [IntegrationsController, WhatsAppWebhookController],
  providers: [TelegramService, WhatsAppService, NotificationsService, ReportService, TelegramBotService, ChatService],
  exports: [NotificationsService, ChatService],
})
export class NotificationsModule {}
