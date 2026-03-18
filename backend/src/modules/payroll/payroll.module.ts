import { Module } from '@nestjs/common'
import { PayrollController } from './payroll.controller'
import { PayrollService } from './payroll.service'
import { PayslipPdfService } from './payslip-pdf.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { MinioService } from '../../common/minio.service'
import { EventsModule } from '../../events/events.module'

// Módulo de Folha de Pagamento
@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayslipPdfService, MinioService],
  exports: [PayrollService, PayslipPdfService],
})
export class PayrollModule {}
