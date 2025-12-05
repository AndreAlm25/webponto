import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/audit/logs
   * Listar logs de auditoria
   */
  @Get('logs')
  @RequirePermission('audit.view')
  async getLogs(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('entityId') entityId?: string,
  ) {
    const companyId = req.user.companyId;
    return this.auditService.getLogs(
      companyId,
      {
        userId,
        module,
        action,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        entityId,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * GET /api/audit/logs/:id
   * Detalhes de um log específico
   */
  @Get('logs/:id')
  @RequirePermission('audit.view')
  async getLogById(@Param('id') id: string) {
    return this.auditService.getLogById(id);
  }

  /**
   * GET /api/audit/modules
   * Listar módulos disponíveis (para filtro)
   */
  @Get('modules')
  @RequirePermission('audit.view')
  async getModules(@Request() req: any) {
    return this.auditService.getModules(req.user.companyId);
  }

  /**
   * GET /api/audit/actions
   * Listar ações disponíveis (para filtro)
   */
  @Get('actions')
  @RequirePermission('audit.view')
  async getActions(@Request() req: any) {
    return this.auditService.getActions(req.user.companyId);
  }

  /**
   * GET /api/audit/stats
   * Estatísticas de auditoria
   */
  @Get('stats')
  @RequirePermission('audit.view')
  async getStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getStats(
      req.user.companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
