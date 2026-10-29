import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuditService } from './audit.service';
import { AlertsController, AuditController, SearchController } from './core.controllers';
import { ClientErrorsController } from './client-errors';
import { EventsController, EventsService } from './events';
import { StockService } from '../products/stock';

@Global()
@Module({
  controllers: [AlertsController, AuditController, SearchController, EventsController, ClientErrorsController],
  providers: [AuditService, AlertsService, EventsService, StockService],
  exports: [AuditService, AlertsService, EventsService, StockService],
})
export class CoreModule {}
