import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { Role } from '@prisma/client';
import { RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /api/permissions
   * Listar todas as permissões disponíveis no sistema
   */
  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('permissions.view')
  async getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }

  /**
   * GET /api/permissions/role?role=MANAGER
   * Listar permissões de um role específico na empresa do usuário
   */
  @Get('role')
  @UseGuards(PermissionGuard)
  @RequirePermission('permissions.view')
  async getRolePermissions(
    @Request() req: any,
    @Query('role') role: Role,
  ) {
    const companyId = req.user.companyId;
    return this.permissionsService.getRolePermissions(companyId, role);
  }

  /**
   * PUT /api/permissions/role
   * Atualizar permissões de um role na empresa do usuário
   */
  @Put('role')
  @UseGuards(PermissionGuard)
  @RequirePermission('permissions.edit')
  async updateRolePermissions(
    @Request() req: any,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    const companyId = req.user.companyId;
    return this.permissionsService.updateRolePermissions(companyId, dto);
  }

  /**
   * GET /api/permissions/me
   * Obter permissões do usuário atual (para o frontend)
   */
  @Get('me')
  async getMyPermissions(@Request() req: any) {
    return this.permissionsService.getUserPermissions(req.user.id);
  }
}
