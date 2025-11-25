import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardConfigService } from './dashboard-config.service';
import { UpdateDashboardConfigDto } from './dto/update-dashboard-config.dto';

@Controller('dashboard-config')
@UseGuards(JwtAuthGuard)
export class DashboardConfigController {
  constructor(private readonly dashboardConfigService: DashboardConfigService) {}

  // Buscar configurações do dashboard
  @Get()
  async getConfig(@Query('companyId') companyId: string) {
    return this.dashboardConfigService.getConfig(companyId);
  }

  // Atualizar configurações do dashboard
  @Patch()
  async updateConfig(@Body() dto: UpdateDashboardConfigDto) {
    return this.dashboardConfigService.updateConfig(dto);
  }
}
