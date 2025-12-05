import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards';
import { RequirePermission } from '../../common/decorators';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Controller('companies/settings/app')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  // Buscar configurações do app
  @Get()
  @RequirePermission('settings.view')
  async getSettings(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.appSettingsService.getSettings(companyId);
  }

  // Atualizar configurações do app
  @Put()
  @RequirePermission('settings.edit')
  async updateSettings(@Request() req: any, @Body() dto: UpdateAppSettingsDto) {
    const companyId = req.user.companyId;
    return this.appSettingsService.updateSettings(companyId, dto);
  }
}
