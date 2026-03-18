import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { HolidayType } from '@prisma/client';

@Controller('holidays')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  /**
   * GET /holidays
   * Listar feriados da empresa
   */
  @Get()
  @RequirePermission('holidays.view')
  async list(@Query('year') year: string, @Request() req) {
    const companyId = req.user.companyId;
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.holidaysService.list(companyId, yearNum);
  }

  /**
   * GET /holidays/:id
   * Buscar feriado por ID
   */
  @Get(':id')
  @RequirePermission('holidays.view')
  async findById(@Param('id') id: string, @Request() req) {
    return this.holidaysService.findById(id, req.user.companyId);
  }

  /**
   * POST /holidays
   * Criar novo feriado
   */
  @Post()
  @RequirePermission('holidays.create')
  async create(
    @Body()
    body: {
      name: string;
      date: string;
      type?: HolidayType;
      recurring?: boolean;
      halfDay?: boolean;
      notes?: string;
    },
    @Request() req,
  ) {
    return this.holidaysService.create({
      companyId: req.user.companyId,
      name: body.name,
      date: new Date(body.date),
      type: body.type,
      recurring: body.recurring,
      halfDay: body.halfDay,
      notes: body.notes,
    });
  }

  /**
   * PUT /holidays/:id
   * Atualizar feriado
   */
  @Put(':id')
  @RequirePermission('holidays.update')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      date?: string;
      type?: HolidayType;
      recurring?: boolean;
      halfDay?: boolean;
      active?: boolean;
      notes?: string;
    },
    @Request() req,
  ) {
    return this.holidaysService.update(id, req.user.companyId, {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
    });
  }

  /**
   * DELETE /holidays/:id
   * Deletar feriado
   */
  @Delete(':id')
  @RequirePermission('holidays.delete')
  async delete(@Param('id') id: string, @Request() req) {
    return this.holidaysService.delete(id, req.user.companyId);
  }

  /**
   * POST /holidays/import-national
   * Importar feriados nacionais brasileiros
   */
  @Post('import-national')
  @RequirePermission('holidays.create')
  async importNational(@Body() body: { year: number }, @Request() req) {
    const year = body.year || new Date().getFullYear();
    return this.holidaysService.importNationalHolidays(req.user.companyId, year);
  }

  /**
   * GET /holidays/check/:date
   * Verificar se uma data é feriado
   */
  @Get('check/:date')
  @RequirePermission('holidays.view')
  async checkHoliday(@Param('date') date: string, @Request() req) {
    const isHoliday = await this.holidaysService.isHoliday(
      req.user.companyId,
      new Date(date),
    );
    const holiday = isHoliday
      ? await this.holidaysService.getHolidayByDate(
          req.user.companyId,
          new Date(date),
        )
      : null;

    return { isHoliday, holiday };
  }
}
