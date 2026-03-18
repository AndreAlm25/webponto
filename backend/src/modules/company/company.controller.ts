import { Controller, Get, Put, Body, Query, UseGuards, BadRequestException } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CompanyService } from './company.service'
import { UpdateCompanyDto } from './dto/update-company.dto'

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async getCompany(@Query('companyId') companyId: string) {
    if (!companyId) {
      throw new BadRequestException('companyId é obrigatório')
    }
    return this.companyService.getCompany(companyId)
  }

  @Put()
  async updateCompany(
    @Query('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('companyId é obrigatório')
    }
    return this.companyService.updateCompany(companyId, dto)
  }
}
