import { Module } from '@nestjs/common';
import { DashboardConfigController } from './dashboard-config.controller';
import { DashboardConfigService } from './dashboard-config.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [DashboardConfigController],
  providers: [DashboardConfigService],
  exports: [DashboardConfigService],
})
export class DashboardConfigModule {}
