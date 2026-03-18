import { Module } from '@nestjs/common'
import { VacationsController } from './vacations.controller'
import { VacationsService } from './vacations.service'
import { VacationRequestsController } from './vacation-requests.controller'
import { VacationRequestsService } from './vacation-requests.service'
import { VacationPdfService } from './vacation-pdf.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { MinioService } from '../../common/minio.service'
import { EventsModule } from '../../events/events.module'

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [VacationsController, VacationRequestsController],
  providers: [VacationsService, VacationRequestsService, VacationPdfService, MinioService],
  exports: [VacationsService, VacationRequestsService, VacationPdfService],
})
export class VacationsModule {}
