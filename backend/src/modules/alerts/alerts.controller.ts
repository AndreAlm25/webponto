import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * GET /api/alerts?companyId=xxx&type=xxx&severity=xxx
   * Listar todos os alertas da empresa
   */
  @Get()
  async list(
    @Query('companyId') companyId: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.alertsService.getCompanyAlerts(companyId, {
      type,
      severity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * GET /api/alerts/summary?companyId=xxx
   * Resumo de alertas (para badge no header)
   */
  @Get('summary')
  async summary(@Query('companyId') companyId: string) {
    return this.alertsService.getAlertsSummary(companyId);
  }
}
