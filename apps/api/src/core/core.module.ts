import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuditService } from './audit.service';
import { AlertsController, AuditController, SearchController } from './core.controllers';
import { EventsController, EventsService } from './events';

@Global()
@Module({
  controllers: [AlertsController, AuditController, SearchController, EventsController],
  providers: [AuditService, AlertsService, EventsService],
  exports: [AuditService, AlertsService, EventsService],
})
export class CoreModule {}
