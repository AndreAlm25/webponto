import { Controller, Get, Put, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplianceLevel } from '@prisma/client';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  /**
   * GET /api/compliance?companyId=xxx
   * Buscar configurações de conformidade da empresa
   */
  @Get()
  async get(@Query('companyId') companyId: string) {
    return this.complianceService.getCompanyCompliance(companyId);
  }

  /**
   * PUT /api/compliance?companyId=xxx
   * Atualizar configurações de conformidade
   */
  @Put()
  async update(
    @Query('companyId') companyId: string,
    @Body()
    data: {
      complianceLevel?: ComplianceLevel;
      enforceWorkHours?: boolean;
      enforceRestPeriod?: boolean;
      enforceOvertimeRules?: boolean;
      enforceTimeBankRules?: boolean;
      allowNegativeBalance?: boolean;
      customOvertimeRate?: number;
      customHolidayRate?: number;
      warnOnViolation?: boolean;
      enableTolerances?: boolean;
      earlyEntryToleranceMinutes?: number;
      lateExitToleranceMinutes?: number;
      lateArrivalToleranceMinutes?: number;
    },
  ) {
    return this.complianceService.updateCompanyCompliance(companyId, data);
  }

  /**
   * GET /api/compliance/dashboard?startDate=xxx&endDate=xxx
   * Dashboard de conformidade com estatísticas
   */
  @Get('dashboard')
  async getDashboard(
    @Query('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceService.getDashboardStats(
      companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
