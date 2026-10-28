import { Global, Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BotService } from './bot.service';
import { ChannelsController } from './channels.controller';
import { ChatService } from './chat.service';
import { IntegrationsController } from './integrations.controller';
import { NotificationsService } from './notifications.service';
import { ReportService } from './report.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramService } from './telegram.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppService } from './whatsapp.service';

@Global()
@Module({
  imports: [StatsModule],
  controllers: [IntegrationsController, WhatsAppWebhookController, TelegramWebhookController, ChannelsController],
  providers: [TelegramService, WhatsAppService, NotificationsService, ReportService, BotService, TelegramBotService, ChatService],
  exports: [NotificationsService, ChatService, TelegramService],
})
export class NotificationsModule {}
