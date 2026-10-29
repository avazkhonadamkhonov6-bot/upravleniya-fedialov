import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuditService } from './audit.service';
import { AlertsController, AuditController, SearchController } from './core.controllers';
import { ClientErrorsController } from './client-errors';
import { EventsController, EventsService } from './events';

@Global()
@Module({
  controllers: [AlertsController, AuditController, SearchController, EventsController, ClientErrorsController],
  providers: [AuditService, AlertsService, EventsService],
  exports: [AuditService, AlertsService, EventsService],
})
export class CoreModule {}
