import { Global, Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { BotService } from './bot.service';
import { BusinessWhatsAppController } from './business-whatsapp.controller';
import { ChannelsController } from './channels.controller';
import { ChatService } from './chat.service';
import { CustomerBotService } from './customer-bot.service';
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
  controllers: [IntegrationsController, WhatsAppWebhookController, TelegramWebhookController, ChannelsController, BusinessWhatsAppController],
  providers: [TelegramService, WhatsAppService, NotificationsService, ReportService, BotService, TelegramBotService, ChatService, CustomerBotService],
  exports: [NotificationsService, ChatService, TelegramService, WhatsAppService, CustomerBotService],
})
export class NotificationsModule {}
