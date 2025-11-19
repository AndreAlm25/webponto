import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';
import { RegistrarPontoFacialDto } from './dto/registrar-ponto-facial.dto';
import { RegistrarPontoManualDto } from './dto/registrar-ponto-manual.dto';
import { CadastrarFaceDto } from './dto/cadastrar-face.dto';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  /**
   * POST /pontos/facial
   * Registrar ponto com reconhecimento facial
   */
  @Post('facial')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('foto'))
  async registrarPontoFacial(
    @UploadedFile() foto: Express.Multer.File,
    @Body() dto: RegistrarPontoFacialDto,
    @Request() req,
  ) {
    // Log para debug
    console.log('[FACIAL] 📸 Recebendo requisição de ponto facial')
    console.log('[FACIAL] 📦 DTO recebido:', dto)
    console.log('[FACIAL] 🖼️ Foto presente:', !!foto)
    console.log('[FACIAL] 👤 User do token:', req.user)
    
    if (!foto) {
      throw new BadRequestException('Foto é obrigatória');
    }

    // TODO: Adicionar autenticação JWT e pegar companyId do token
    const companyId: string | undefined = req.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Empresa não identificada');
    }

    const ip = req.ip || req.connection?.remoteAddress || undefined;
    const result = await this.timeEntriesService.registrarPontoFacial(
      foto.buffer,
      companyId,
      dto.latitude,
      dto.longitude,
      dto.dispositivoId,
      {
        accuracy: dto.accuracy,
        clientCapturedAt: dto.clientCapturedAt,
        geoMethod: dto.geoMethod,
        source: dto.source,
        ip,
        livenessScore: dto.livenessScore,
        livenessValid: dto.livenessValid,
        type: dto.type,
      },
    );

    // Retornar no formato esperado pelo frontend
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /pontos/facial/cadastro
   * Cadastrar face de um funcionário
   */
  @Post('facial/cadastro')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('foto'))
  async cadastrarFace(
    @UploadedFile() foto: Express.Multer.File,
    @Body() body: CadastrarFaceDto,
    @Request() req,
  ) {
    const employeeId = body.employeeId;
    console.log('🔥 [CADASTRO] Recebido:', {
      foto: foto ? 'SIM' : 'NÃO',
      employeeId,
      tipo: typeof employeeId,
      body: req.body
    });
    
    console.log('🔥 [CADASTRO] req.user:', req.user);
    console.log('🔥 [CADASTRO] req.user?.companyId:', req.user?.companyId);

    if (!foto) {
      throw new BadRequestException('Foto é obrigatória');
    }

    // TODO: Adicionar autenticação JWT e pegar companyId do token
    const companyId: string | undefined = req.user?.companyId;
    if (!companyId) {
      console.error('🔥 [CADASTRO] ❌ ERRO: Empresa não identificada no token!');
      console.error('🔥 [CADASTRO] req.user completo:', JSON.stringify(req.user, null, 2));
      throw new UnauthorizedException('Empresa não identificada');
    }

    console.log('🔥 [CADASTRO] Chamando service com employeeId:', employeeId);

    return await this.timeEntriesService.cadastrarFace(
      employeeId,
      foto.buffer,
      companyId,
    );
  }

  /**
   * GET /pontos/facial/status/:employeeId
   * Obter status do funcionário (último ponto e próximo tipo)
   */
  @Get('facial/status/:employeeId')
  @UseGuards(JwtAuthGuard)
  async obterStatus(
    @Param('employeeId') employeeId: string,
    @Request() req,
  ) {
    // TODO: Adicionar autenticação JWT e pegar companyId do token
    const companyId: string | undefined = req.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Empresa não identificada');
    }

    return await this.timeEntriesService.obterStatus(employeeId, companyId);
  }

  /**
   * DELETE /pontos/facial/:employeeId
   * Excluir face do funcionário (CompreFace + BD)
   */
  @Delete('facial/:employeeId')
  @UseGuards(JwtAuthGuard)
  async excluirFace(
    @Param('employeeId') employeeId: string,
    @Request() req,
  ) {
    const companyId: string | undefined = req.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Empresa não identificada');
    }

    return await this.timeEntriesService.excluirFace(employeeId, companyId);
  }

  /**
   * GET /pontos/:employeeId
   * Listar pontos de um funcionário
   */
  @Get(':employeeId')
  @UseGuards(JwtAuthGuard)
  async listarPontos(
    @Param('employeeId') employeeId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Request() req?,
  ) {
    // TODO: Adicionar autenticação JWT e pegar companyId do token
    const companyId: string | undefined = req.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Empresa não identificada');
    }

    // Converter strings de data para Date, adicionando 'T00:00:00' para evitar problemas de timezone
    const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : undefined;
    const fim = dataFim ? new Date(dataFim + 'T23:59:59') : undefined;

    return await this.timeEntriesService.listarPontos(
      employeeId,
      companyId,
      inicio,
      fim,
    );
  }

  /**
   * POST /time-entries
   * Registrar ponto manual com geolocalização
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async registrarPontoManual(
    @Body() body: RegistrarPontoManualDto,
    @Request() req,
  ) {
    const companyId: string | undefined = req.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('Empresa não identificada');
    }
    const ip = req.ip || req.connection?.remoteAddress || undefined;
    return await this.timeEntriesService.registrarPontoManual({
      companyId,
      employeeId: body.employeeId,
      type: body.type,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      clientCapturedAt: body.clientCapturedAt,
      geoMethod: body.geoMethod,
      source: body.source,
      notes: body.notes,
      ip,
    });
  }
}
