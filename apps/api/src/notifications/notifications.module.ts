import { Global, Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { AiInsightsService } from './ai-insights.service';
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
import { BackInStockService } from './back-in-stock.service';

@Global()
@Module({
  imports: [StatsModule],
  controllers: [IntegrationsController, WhatsAppWebhookController, TelegramWebhookController, ChannelsController, BusinessWhatsAppController],
  providers: [AiInsightsService, TelegramService, WhatsAppService, NotificationsService, ReportService, BotService, TelegramBotService, ChatService, CustomerBotService, BackInStockService],
  exports: [AiInsightsService, NotificationsService, ChatService, TelegramService, WhatsAppService, CustomerBotService, BackInStockService],
})
export class NotificationsModule {}
