import { Module } from '@nestjs/common'
import { EmployeesService } from './employees.service'
import { EmployeesController } from './employees.controller'
import { PrismaModule } from '../../prisma/prisma.module'
import { EventsModule } from '../../events/events.module'

// Módulo de funcionários: expõe endpoints utilitários
@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
