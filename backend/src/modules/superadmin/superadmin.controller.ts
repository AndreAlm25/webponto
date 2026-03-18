import {
  Controller, Get, Post, Put, Patch, Body, Param, Query,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SuperAdminService } from './superadmin.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'

@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // ── Empresas ──────────────────────────────────────────────
  @Get('companies')
  listCompanies(@Query('search') search?: string) {
    return this.superAdminService.listCompanies(search)
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.superAdminService.getCompany(id)
  }

  @Post('companies')
  createCompany(@Body() body: any) {
    return this.superAdminService.createCompany(body)
  }

  @Put('companies/:id')
  updateCompany(@Param('id') id: string, @Body() body: any) {
    return this.superAdminService.updateCompany(id, body)
  }

  @Patch('companies/:id/toggle-active')
  toggleCompanyActive(@Param('id') id: string) {
    return this.superAdminService.toggleCompanyActive(id)
  }

  // ── Usuários Admin ─────────────────────────────────────────
  @Get('companies/:companyId/admins')
  listCompanyAdmins(@Param('companyId') companyId: string) {
    return this.superAdminService.listCompanyAdmins(companyId)
  }

  @Post('companies/:companyId/admins')
  createCompanyAdmin(@Param('companyId') companyId: string, @Body() body: any) {
    return this.superAdminService.createCompanyAdmin(companyId, body)
  }

  @Patch('admins/:userId/toggle-active')
  toggleAdminActive(@Param('userId') userId: string) {
    return this.superAdminService.toggleAdminActive(userId)
  }

  @Patch('admins/:userId/reset-password')
  resetAdminPassword(@Param('userId') userId: string, @Body() body: { password: string }) {
    if (!body.password || body.password.length < 6) {
      throw new BadRequestException('Senha deve ter pelo menos 6 caracteres')
    }
    return this.superAdminService.resetAdminPassword(userId, body.password)
  }

  // ── Estatísticas globais ───────────────────────────────────
  @Get('stats')
  getStats() {
    return this.superAdminService.getStats()
  }
}
