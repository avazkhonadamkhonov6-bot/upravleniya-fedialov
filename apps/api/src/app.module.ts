import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { StaffAccessGuard } from './auth/staff-access.guard';
import { BranchesModule } from './branches/branches.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';
import { CoreModule } from './core/core.module';
import { CustomersModule } from './customers/customers';
import { ExpensesModule } from './expenses/expenses';
import { ShiftsModule } from './shifts/shifts';
import { TasksModule } from './tasks/tasks';
import { MessagesModule } from './messages/messages';
import { CallsModule } from './calls/calls';
import { ShopModule } from './shop/shop';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CoreModule,
    AuthModule,
    NotificationsModule,
    BranchesModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    StatsModule,
    CustomersModule,
    TasksModule,
    ShiftsModule,
    ExpensesModule,
    MessagesModule,
    CallsModule,
    ShopModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: StaffAccessGuard },
  ],
})
export class AppModule {}
