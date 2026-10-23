import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuditService } from './audit.service';
import { AlertsController, AuditController, SearchController } from './core.controllers';

@Global()
@Module({
  controllers: [AlertsController, AuditController, SearchController],
  providers: [AuditService, AlertsService],
  exports: [AuditService, AlertsService],
})
export class CoreModule {}
