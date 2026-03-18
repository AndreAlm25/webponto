import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards';
import { RequirePermission } from '../../common/decorators';
import { OvertimeStatus } from '@prisma/client';

@Controller('overtime')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  /**
   * GET /api/overtime?companyId=xxx&status=PENDING&employeeId=xxx&startDate=xxx&endDate=xxx
   * Listar horas extras com filtros
   */
  @Get()
  @RequirePermission('overtime.view')
  async listar(
    @Query('companyId') companyId: string,
    @Query('status') status?: OvertimeStatus,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.overtimeService.listarHorasExtras(companyId, {
      status,
      employeeId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * GET /api/overtime/stats?companyId=xxx
   * Estatísticas de horas extras (pendentes, aprovadas, rejeitadas)
   */
  @Get('stats')
  @RequirePermission('overtime.view')
  async estatisticas(@Query('companyId') companyId: string) {
    return this.overtimeService.contarPorStatus(companyId);
  }

  /**
   * GET /api/overtime/time-bank?companyId=xxx&employeeId=xxx
   * Banco de horas: saldo consolidado por funcionário
   */
  @Get('time-bank')
  @RequirePermission('overtime.view')
  async bancoDeHoras(
    @Query('companyId') companyId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.overtimeService.bancodeHoras(companyId, employeeId);
  }

  /**
   * PATCH /api/overtime/:id/approve
   * Aprovar hora extra
   */
  @Patch(':id/approve')
  @RequirePermission('overtime.approve')
  async aprovar(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { notes?: string },
  ) {
    return this.overtimeService.aprovarHoraExtra(id, req.user.userId, body.notes);
  }

  /**
   * PATCH /api/overtime/:id/reject
   * Rejeitar hora extra
   */
  @Patch(':id/reject')
  @RequirePermission('overtime.reject')
  async rejeitar(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { notes?: string },
  ) {
    return this.overtimeService.rejeitarHoraExtra(id, req.user.userId, body.notes);
  }

  /**
   * POST /api/overtime/approve-batch
   * Aprovar múltiplas horas extras
   */
  @Post('approve-batch')
  @RequirePermission('overtime.approve')
  async aprovarLote(@Request() req: any, @Body() body: { timeEntryIds: string[] }) {
    return this.overtimeService.aprovarEmLote(body.timeEntryIds, req.user.userId);
  }

  /**
   * POST /api/overtime/reject-batch
   * Rejeitar múltiplas horas extras
   */
  @Post('reject-batch')
  @RequirePermission('overtime.reject')
  async rejeitarLote(
    @Request() req: any,
    @Body() body: { timeEntryIds: string[]; notes?: string },
  ) {
    return this.overtimeService.rejeitarEmLote(body.timeEntryIds, req.user.userId, body.notes);
  }
}
