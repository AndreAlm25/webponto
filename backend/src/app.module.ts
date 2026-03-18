import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { PayrollModule } from './modules/payroll/payroll.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuditModule } from './modules/audit/audit.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { CompanyModule } from './modules/company/company.module';
import { VacationsModule } from './modules/vacations/vacations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting - Proteção contra ataques de força bruta
    // Limite: 100 requisições por minuto por IP
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 60 segundos (1 minuto)
      limit: 100,   // 100 requisições por minuto
    }]),
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
    PayrollModule,
    PermissionsModule,
    AuditModule,
    HolidaysModule,
    CompanyModule,
    VacationsModule,
    SeedModule,
    FilesModule,
  ],
  providers: [
    // Aplicar Rate Limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
