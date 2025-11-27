import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { SeedModule } from './seed/seed.module';
import { FilesModule } from './modules/files/files.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { PositionsModule } from './modules/positions/positions.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { MessagesModule } from './modules/messages/messages.module';
import { EventsModule } from './events/events.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DashboardConfigModule } from './modules/dashboard-config/dashboard-config.module';
import { AppSettingsModule } from './modules/app-settings/app-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    EventsModule,
    TimeEntriesModule,
    EmployeesModule,
    PositionsModule,
    DepartmentsModule,
    MessagesModule,
    GeofencesModule,
    GeocodingModule,
    OvertimeModule,
    AlertsModule,
    ComplianceModule,
    DashboardConfigModule,
    AppSettingsModule,
    SeedModule,
    FilesModule,
  ],
})
export class AppModule {}
