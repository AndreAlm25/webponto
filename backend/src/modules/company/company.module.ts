import { Module } from '@nestjs/common'
import { CompanyController } from './company.controller'
import { CompanyService } from './company.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { EmailService } from '../../common/email.service'

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [CompanyService, EmailService],
  exports: [CompanyService],
})
export class CompanyModule {}
