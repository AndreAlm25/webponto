import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Controller('companies/settings/app')
@UseGuards(JwtAuthGuard)
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  // Buscar configurações do app
  @Get()
  async getSettings(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.appSettingsService.getSettings(companyId);
  }

  // Atualizar configurações do app
  @Put()
  async updateSettings(@Request() req: any, @Body() dto: UpdateAppSettingsDto) {
    const companyId = req.user.companyId;
    return this.appSettingsService.updateSettings(companyId, dto);
  }
}
