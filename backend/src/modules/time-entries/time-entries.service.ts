import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComprefaceService } from '../../common/compreface.service';
import { MinioService } from '../../common/minio.service';
import { EventsGateway } from '../../events/events.gateway';
import { TimeEntryType, TimeEntryStatus, GeofenceStatus, GeofencePolicy } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    private prisma: PrismaService,
    private compreface: ComprefaceService,
    private minio: MinioService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Register time entry with facial recognition
   */
  async registrarPontoFacial(
    imageBuffer: Buffer,
    companyId: string,
    latitude?: number,
    longitude?: number,
    dispositivoId?: string,
    meta?: {
      accuracy?: number
      clientCapturedAt?: string
      geoMethod?: string
      source?: string
      ip?: string
      livenessScore?: number
      livenessValid?: boolean
      type?: TimeEntryType
    }
  ) {
    try {
      // 1. Reconhecer face
      this.logger.log('Iniciando reconhecimento facial...');
      const reconhecimento = await this.compreface.recognize(imageBuffer);

      if (!reconhecimento.subjects || reconhecimento.subjects.length === 0) {
        throw new BadRequestException('Rosto não reconhecido. Cadastre sua face primeiro.');
      }

      const match = reconhecimento.subjects[0];
      const similarity = match.similarity;

      // 2. Validar threshold
      if (!this.compreface.isRecognitionValid(similarity)) {
        throw new BadRequestException(
          `Reconhecimento com baixa confiança (${(similarity * 100).toFixed(1)}%). Tente novamente.`
        );
      }

      // 3. Buscar funcionário pelo faceId
      const faceId = match.subject;
      const employee = await this.prisma.employee.findFirst({
        where: {
          faceId,
          companyId,
          active: true,
        },
      });

      if (!employee) {
        throw new NotFoundException('Funcionário não encontrado ou inativo.');
      }

      // 4. Upload da foto para MinIO
      const fotoPath = this.minio.generateTimeEntryPath(companyId, employee.id);
      await this.minio.upload(imageBuffer, fotoPath, 'image/jpeg', 'time-entries');

      // 5. Determine time entry type (usar o enviado pelo frontend ou determinar automaticamente)
      const tipoPonto = meta?.type || await this.determinarTimeEntryType(employee.id);
      
      this.logger.log(`📝 [TIPO] Tipo de ponto: ${tipoPonto} (${meta?.type ? 'enviado pelo frontend' : 'determinado automaticamente'})`);

      // 6. Policies and geofencing validation
      const { geofenceStatus } = await this.validateGeoAndPolicies({
        companyId,
        employeeId: employee.id,
        latitude: latitude ? parseFloat(String(latitude)) : undefined,
        longitude: longitude ? parseFloat(String(longitude)) : undefined,
        accuracy: meta?.accuracy ? parseFloat(String(meta.accuracy)) : undefined,
        livenessValid: String(meta?.livenessValid) === 'true',
        method: 'FACIAL',
      });

      // 7. Register time entry in database
      const timeEntry = await this.prisma.timeEntry.create({
        data: {
          companyId,
          employeeId: employee.id,
          timestamp: new Date(),
          type: tipoPonto,
          method: 'FACIAL_RECOGNITION',
          photoUrl: fotoPath,
          recognitionValid: true,
          similarity,
          latitude: latitude ? parseFloat(String(latitude)) : null,
          longitude: longitude ? parseFloat(String(longitude)) : null,
          accuracy: meta?.accuracy ? parseFloat(String(meta.accuracy)) : null,
          clientCapturedAt: meta?.clientCapturedAt ? new Date(meta.clientCapturedAt) : undefined,
          geoMethod: meta?.geoMethod,
          source: meta?.source,
          ip: meta?.ip,
          geofenceStatus,
          livenessScore: meta?.livenessScore ? parseFloat(String(meta.livenessScore)) : null,
          livenessValid: String(meta?.livenessValid) === 'true',
          synchronized: true,
          status: TimeEntryStatus.VALID,
        },
        include: {
          employee: {
            select: {
              id: true,
              registrationId: true,
            },
          },
        },
      });

      this.logger.log(
        `Time entry registered: Employee ${employee.id} - ${tipoPonto} - ${(similarity * 100).toFixed(1)}% confidence`
      );

      // Emitir evento WebSocket
      this.eventsGateway.emitTimeEntryCreated(companyId, timeEntry);

      const responseData = {
        timeEntry,
        reconhecimento: {
          similarity,
          threshold: this.compreface.getThreshold(),
        },
      };

      this.logger.log(`📤 [RESPOSTA] Retornando dados: ${JSON.stringify(responseData, null, 2)}`);

      return responseData;
    } catch (error) {
      this.logger.error('Error registering facial time entry:', error.message);
      throw error;
    }
  }

  async registrarPontoManual(input: {
    companyId: string
    employeeId: string
    type: TimeEntryType
    latitude?: number
    longitude?: number
    accuracy?: number
    clientCapturedAt?: string
    geoMethod?: string
    source?: string
    notes?: string
    ip?: string
  }) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: input.employeeId, companyId: input.companyId, active: true },
    })
    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    const { geofenceStatus } = await this.validateGeoAndPolicies({
      companyId: input.companyId,
      employeeId: input.employeeId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      method: 'MANUAL',
      notes: input.notes,
    })

    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        companyId: input.companyId,
        employeeId: input.employeeId,
        timestamp: new Date(),
        type: input.type,
        method: 'MANUAL' as any,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        clientCapturedAt: input.clientCapturedAt ? new Date(input.clientCapturedAt) : undefined,
        geoMethod: input.geoMethod,
        source: input.source,
        ip: input.ip,
        notes: input.notes,
        geofenceStatus,
        synchronized: true,
        status: TimeEntryStatus.VALID,
      },
      include: {
        employee: { select: { id: true, registrationId: true } },
      },
    })

    // Emitir evento WebSocket
    this.eventsGateway.emitTimeEntryCreated(input.companyId, timeEntry);

    return timeEntry
  }

  // =========================
  // Helpers de validação de políticas e geofencing
  // =========================

  private haversineMeters(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number | undefined {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return undefined
    const R = 6371000
    const toRad = (x: number) => (x * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private async evaluateGeofence(companyId: string, lat?: number, lng?: number, accuracy?: number) {
    const geofences = await this.prisma.geofence.findMany({ where: { companyId, active: true } })
    if (!lat || !lng || geofences.length === 0) {
      return { status: undefined as GeofenceStatus | undefined, distance: undefined as number | undefined }
    }

    let inside = false
    let borderline = false
    let minDistance = Number.POSITIVE_INFINITY

    for (const g of geofences) {
      const d = this.haversineMeters(lat, lng, g.centerLat, g.centerLng) || Number.POSITIVE_INFINITY
      if (d < minDistance) minDistance = d
      const effectiveRadius = g.radiusMeters + (accuracy || 0)
      if (d <= g.radiusMeters) inside = true
      else if (d <= effectiveRadius) borderline = true
    }

    let status: GeofenceStatus
    if (inside) status = GeofenceStatus.INSIDE
    else if (borderline) status = GeofenceStatus.BORDERLINE
    else status = GeofenceStatus.OUTSIDE

    return { status, distance: isFinite(minDistance) ? minDistance : undefined }
  }

  private async validateGeoAndPolicies(params: {
    companyId: string
    employeeId: string
    latitude?: number
    longitude?: number
    accuracy?: number
    livenessValid?: boolean
    method: 'MANUAL' | 'FACIAL'
    notes?: string
  }): Promise<{ geofenceStatus?: GeofenceStatus }>
  {
    const company = await this.prisma.company.findFirst({ where: { id: params.companyId } })
    if (!company) throw new NotFoundException('Empresa não encontrada.')
    const employee = await this.prisma.employee.findFirst({ 
      where: { id: params.employeeId, companyId: params.companyId },
      include: { geofence: true } // Comentário: incluir cerca do funcionário
    })
    if (!employee) throw new NotFoundException('Funcionário não encontrado.')

    // Comentário: NOVA LÓGICA - Validar ponto remoto
    // Se funcionário não pode bater ponto remoto (allowRemoteClockIn = false), 
    // não precisa validar geolocalização (bate ponto no sistema da empresa)
    if (!employee.allowRemoteClockIn) {
      // Comentário: Funcionário só pode bater ponto no sistema da empresa
      // Não valida geolocalização nem cerca
      return { geofenceStatus: undefined }
    }

    // Comentário: NOVA LÓGICA - Validar cerca do funcionário
    // Se funcionário tem cerca vinculada, exige geolocalização e valida distância
    if (employee.geofence) {
      if (params.latitude == null || params.longitude == null) {
        throw new BadRequestException('Geolocalização obrigatória para funcionários com cerca geográfica.')
      }

      // Comentário: Calcular distância da cerca do funcionário
      const distance = this.haversineMeters(
        params.latitude,
        params.longitude,
        employee.geofence.centerLat,
        employee.geofence.centerLng
      ) || 0

      if (distance > employee.geofence.radiusMeters) {
        throw new BadRequestException(
          `Você está fora da área permitida. Distância: ${Math.round(distance)}m (máximo: ${employee.geofence.radiusMeters}m)`
        )
      }
    }

    // Geofence evaluation
    let geofenceStatus: GeofenceStatus | undefined = undefined
    if (company.geofencingEnabled) {
      const gf = await this.evaluateGeofence(params.companyId, params.latitude, params.longitude, params.accuracy)
      geofenceStatus = gf.status

      switch (company.geofencePolicy) {
        case GeofencePolicy.BLOCK:
          if (geofenceStatus === GeofenceStatus.OUTSIDE) {
            throw new BadRequestException('Fora da cerca configurada.')
          }
          break
        case GeofencePolicy.ALLOW_WITH_JUSTIFICATION:
          if (geofenceStatus === GeofenceStatus.OUTSIDE && !params.notes) {
            throw new BadRequestException('Fora da cerca: justificativa obrigatória.')
          }
          break
        case GeofencePolicy.REQUIRE_LIVENESS:
          if (geofenceStatus === GeofenceStatus.OUTSIDE && params.method === 'FACIAL' && !params.livenessValid) {
            throw new BadRequestException('Fora da cerca: liveness obrigatório para registrar ponto facial.')
          }
          break
        default:
          // ALLOW or undefined → prossegue
          break
      }
    }

    // Liveness global/funcionário
    const livenessRequired = company.requireLiveness || employee.requireLiveness
    if (livenessRequired && params.method === 'FACIAL' && !params.livenessValid) {
      throw new BadRequestException('Prova de vida (liveness) obrigatória para registrar ponto facial.')
    }

    return { geofenceStatus }
  }

  /**
   * Cadastrar face de um funcionário
   */
  async cadastrarFace(employeeId: string, imageBuffer: Buffer, companyId: string) {
    try {
      this.logger.log(`🔥 [CADASTRO] Iniciando cadastro facial para employeeId: ${employeeId}, companyId: ${companyId}`)
      
      // 1. Buscar funcionário
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: employeeId,
          companyId,
          active: true,
        },
      });

      if (!employee) {
        this.logger.error(`🔥 [CADASTRO] Funcionário não encontrado: ${employeeId}`)
        throw new NotFoundException('Funcionário não encontrado.');
      }

      this.logger.log(`🔥 [CADASTRO] Funcionário encontrado: ${employee.id}`)

      // 2. Gerar ID único para o subject (usar ID do funcionário)
      const subjectId = `func_${employeeId}`;
      this.logger.log(`🔥 [CADASTRO] SubjectId gerado: ${subjectId}`)

      // 3. If face already registered, delete before
      if (employee.faceRegistered && employee.faceId) {
        this.logger.log(`🔥 [CADASTRO] Face anterior encontrada, deletando: ${employee.faceId}`);
        try {
          await this.compreface.deleteAllFaces(employee.faceId);
          this.logger.log(`🔥 [CADASTRO] Face anterior deletada com sucesso`)
        } catch (error) {
          this.logger.warn(`🔥 [CADASTRO] Não foi possível deletar face anterior: ${error.message}`);
        }
      }

      // 4. Cadastrar nova face no CompreFace
      this.logger.log(`🔥 [CADASTRO] Enviando imagem para CompreFace...`)
      await this.compreface.addSubject(imageBuffer, subjectId);
      this.logger.log(`🔥 [CADASTRO] Face cadastrada no CompreFace com sucesso!`)

      // 5. Upload da foto de perfil no MinIO
      this.logger.log(`🔥 [CADASTRO] Fazendo upload da foto no MinIO...`)
      const fotoPath = this.minio.generateProfilePath(companyId, employeeId);
      await this.minio.upload(imageBuffer, fotoPath, 'image/jpeg', 'employees');
      this.logger.log(`🔥 [CADASTRO] Foto salva no MinIO: ${fotoPath}`)

      // 6. Atualizar funcionário e criar FaceProfile
      this.logger.log(`🔥 [CADASTRO] Atualizando registro do funcionário no BD...`)
      const employeeUpdated = await this.prisma.employee.update({
        where: { id: employeeId },
        data: {
          faceId: subjectId,
          faceRegistered: true,
        },
      });

      // 7. Criar ou atualizar FaceProfile
      this.logger.log(`🔥 [CADASTRO] Criando/atualizando FaceProfile...`)
      const faceProfile = await this.prisma.faceProfile.upsert({
        where: {
          provider_subjectId_companyId: {
            provider: 'COMPREFACE',
            subjectId: subjectId,
            companyId: companyId,
          },
        },
        create: {
          employeeId: employeeId,
          companyId: companyId,
          provider: 'COMPREFACE',
          subjectId: subjectId,
          status: 'REGISTERED',
          lastSyncAt: new Date(),
        },
        update: {
          status: 'REGISTERED',
          lastSyncAt: new Date(),
        },
      });

      this.logger.log(`🔥 [CADASTRO] ✅ CADASTRO CONCLUÍDO COM SUCESSO!`);
      this.logger.log(`🔥 [CADASTRO] Employee: ${employee.id} (${subjectId})`);
      this.logger.log(`🔥 [CADASTRO] FaceProfile: ${faceProfile.id}`);

      return {
        success: true,
        message: 'Face cadastrada com sucesso!',
        employee: {
          id: employeeUpdated.id,
          faceRegistered: employeeUpdated.faceRegistered,
        },
        faceProfile: {
          id: faceProfile.id,
          status: faceProfile.status,
        },
      };
    } catch (error) {
      this.logger.error(`🔥 [CADASTRO] ❌ ERRO ao cadastrar face: ${error.message}`);
      this.logger.error(`🔥 [CADASTRO] Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Determine time entry type automatically
   * Based on last time entry of the day
   */
  private async determinarTimeEntryType(employeeId: string): Promise<TimeEntryType> {
    const today = new Date();
    const startDay = startOfDay(today);
    const endDay = endOfDay(today);

    // Find last time entry of the day
    const lastEntry = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        timestamp: {
          gte: startDay,
          lte: endDay,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // If no entry today, it's CLOCK_IN
    if (!lastEntry) {
      return TimeEntryType.CLOCK_IN;
    }

    // Logic based on last type
    switch (lastEntry.type) {
      case TimeEntryType.CLOCK_IN:
        return TimeEntryType.BREAK_START;
      
      case TimeEntryType.BREAK_START:
        return TimeEntryType.BREAK_END;
      
      case TimeEntryType.BREAK_END:
        return TimeEntryType.CLOCK_OUT;
      
      case TimeEntryType.CLOCK_OUT:
        // Se já bateu saída, volta para entrada (hora extra ou segundo turno)
        return TimeEntryType.CLOCK_IN;
      
      default:
        return TimeEntryType.CLOCK_IN;
    }
  }

  /**
   * Get employee status (last entry and next type)
   */
  async obterStatus(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
        active: true,
      },
      include: {
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    // Validar se face está cadastrada no BD E no CompreFace
    let hasFace = false
    if (employee.faceRegistered && employee.faceId) {
      try {
        // Verificar se existe no CompreFace
        const subjects = await this.compreface.listSubjects()
        hasFace = subjects?.includes(employee.faceId) || false
        
        // Se não existe no CompreFace mas está marcado no BD, corrigir
        if (!hasFace && employee.faceRegistered) {
          this.logger.warn(`Face marcada no BD mas não existe no CompreFace. Corrigindo...`)
          await this.prisma.employee.update({
            where: { id: employeeId },
            data: { 
              faceRegistered: false,
              faceId: null,
            },
          })
        }
      } catch (error) {
        this.logger.warn(`Erro ao verificar face no CompreFace: ${error.message}`)
        hasFace = employee.faceRegistered
      }
    }

    const today = new Date();
    const startDay = startOfDay(today);
    const endDay = endOfDay(today);

    // Find today's entries
    const todayEntries = await this.prisma.timeEntry.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: startDay,
          lte: endDay,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Determinar próximo tipo
    const nextType = await this.determinarTimeEntryType(employeeId);

    return {
      employee: {
        id: employee.id,
        registrationId: employee.registrationId,
        faceRegistered: employee.faceRegistered,
      },
      hasFace, // Validação real (BD + CompreFace)
      todayEntries,
      nextType,
      totalEntriesToday: todayEntries.length,
    };
  }

  /**
   * Delete employee face from CompreFace and database
   */
  async excluirFace(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
        active: true,
      },
      include: {
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    if (employee.faceId) {
      try {
        // Excluir do CompreFace
        await this.compreface.deleteSubject(employee.faceId)
        this.logger.log(`Face excluída do CompreFace: ${employee.faceId}`)
      } catch (error) {
        this.logger.warn(`Erro ao excluir do CompreFace: ${error.message}`)
      }
    }

    // Atualizar banco de dados (Employee e FaceProfile)
    await this.prisma.$transaction([
      // Atualizar Employee
      this.prisma.employee.update({
        where: { id: employeeId },
        data: { 
          faceRegistered: false,
          faceId: null,
        },
      }),
      // Deletar FaceProfile(s) do funcionário
      this.prisma.faceProfile.deleteMany({
        where: {
          employeeId: employeeId,
          companyId: companyId,
        },
      }),
    ])

    this.logger.log(`Face excluída do BD (Employee e FaceProfile): ${employeeId}`)

    return {
      success: true,
      message: 'Face excluída com sucesso',
    }
  }

  /**
   * List employee time entries
   */
  async listarPontos(
    employeeId: string,
    companyId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
        active: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    const where: any = {
      employeeId,
      companyId,
    };

    if (dataInicio || dataFim) {
      where.timestamp = {};
      if (dataInicio) where.timestamp.gte = startOfDay(dataInicio);
      if (dataFim) where.timestamp.lte = endOfDay(dataFim);
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
          },
        },
      },
    });

    return timeEntries;
  }
}
