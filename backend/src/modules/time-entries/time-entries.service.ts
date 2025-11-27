import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComprefaceService } from '../../common/compreface.service';
import { MinioService } from '../../common/minio.service';
import { EventsGateway } from '../../events/events.gateway';
import { ComplianceService } from '../compliance/compliance.service';
import { TimeEntryType, TimeEntryStatus, GeofenceStatus, GeofencePolicy, OvertimeStatus, OvertimeType } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    private prisma: PrismaService,
    private compreface: ComprefaceService,
    private minio: MinioService,
    private eventsGateway: EventsGateway,
    private complianceService: ComplianceService,
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

      // 7. Detectar hora extra, atraso e violações
      const timestamp = new Date();
      const detectionData = await this.detectOvertimeAndViolations(employee.id, timestamp, tipoPonto);

      // 8. Validar conformidade CLT
      const complianceValidation = await this.complianceService.validateTimeEntry(
        companyId,
        employee.id,
        timestamp,
        tipoPonto,
        detectionData.overtimeMinutes,
      );

      // Se não permitido (bloqueado), lançar erro com mensagem detalhada
      if (!complianceValidation.allowed) {
        this.logger.error(`🚫 [COMPLIANCE] Registro bloqueado por violação CLT`);
        
        // Criar mensagem detalhada baseada nas violações
        let detailedMessage = 'Registro de ponto bloqueado por violação das regras CLT';
        if (complianceValidation.violations.length > 0) {
          detailedMessage = complianceValidation.violations.join('. ');
        }
        
        throw new BadRequestException({
          message: detailedMessage,
          violations: complianceValidation.violations,
          type: 'COMPLIANCE_VIOLATION',
        });
      }

      // Se tem avisos, logar
      if (complianceValidation.shouldWarn && complianceValidation.violations.length > 0) {
        this.logger.warn(`⚠️ [COMPLIANCE] Violações detectadas: ${complianceValidation.violations.join(', ')}`);
      }

      // 9. Register time entry in database
      const timeEntry = await this.prisma.timeEntry.create({
        data: {
          companyId,
          employeeId: employee.id,
          timestamp,
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
          // Hora extra
          isOvertime: detectionData.isOvertime,
          overtimeStatus: detectionData.overtimeStatus,
          overtimeMinutes: detectionData.overtimeMinutes,
          overtimeType: detectionData.overtimeType,
          overtimeRate: detectionData.overtimeRate,
          overtimeValue: detectionData.overtimeValue,
          exceedsLimit: detectionData.exceedsLimit || false,
          // Atraso
          isLate: detectionData.isLate || false,
          lateMinutes: detectionData.lateMinutes,
          // Violação de descanso
          violatesRest: detectionData.violatesRest || false,
          restHours: detectionData.restHours,
        },
        include: {
          employee: {
            select: {
              id: true,
              registrationId: true,
              user: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
              position: {
                select: {
                  name: true,
                },
              },
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

    // Detectar hora extra, atraso e violações
    const timestamp = new Date();
    const detectionData = await this.detectOvertimeAndViolations(input.employeeId, timestamp, input.type);

    // Validar conformidade CLT (mesma validação do ponto facial)
    const complianceValidation = await this.complianceService.validateTimeEntry(
      input.companyId,
      input.employeeId,
      timestamp,
      input.type,
      detectionData.overtimeMinutes,
    );

    // Se não permitido (bloqueado), lançar erro com mensagem detalhada
    if (!complianceValidation.allowed) {
      this.logger.error(`🚫 [COMPLIANCE] Ponto manual bloqueado por violação CLT`);
      
      // Criar mensagem detalhada baseada nas violações
      let detailedMessage = 'Registro de ponto bloqueado por violação das regras CLT';
      if (complianceValidation.violations.length > 0) {
        detailedMessage = complianceValidation.violations.join('. ');
      }
      
      throw new BadRequestException({
        message: detailedMessage,
        violations: complianceValidation.violations,
        type: 'COMPLIANCE_VIOLATION',
      });
    }

    // Se tem avisos, logar
    if (complianceValidation.shouldWarn && complianceValidation.violations.length > 0) {
      this.logger.warn(`⚠️ [COMPLIANCE] Violações detectadas no ponto manual: ${complianceValidation.violations.join(', ')}`);
    }

    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        companyId: input.companyId,
        employeeId: input.employeeId,
        timestamp,
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
        // Hora extra
        isOvertime: detectionData.isOvertime,
        overtimeStatus: detectionData.overtimeStatus,
        overtimeMinutes: detectionData.overtimeMinutes,
        overtimeType: detectionData.overtimeType,
        overtimeRate: detectionData.overtimeRate,
        overtimeValue: detectionData.overtimeValue,
        exceedsLimit: detectionData.exceedsLimit || false,
        // Atraso
        isLate: detectionData.isLate || false,
        lateMinutes: detectionData.lateMinutes,
        // Violação de descanso
        violatesRest: detectionData.violatesRest || false,
        restHours: detectionData.restHours,
      },
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
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

      // 8. Emitir evento WebSocket para atualizar frontend em tempo real
      this.logger.log(`🔥 [CADASTRO] Emitindo evento WebSocket face-registered...`);
      this.eventsGateway.emitFaceRegistered(companyId, employeeUpdated.id, {
        faceRegistered: true,
      });

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
   * Detectar e calcular hora extra, atraso e violação de descanso
   * Retorna dados completos para TimeEntry
   */
  private async detectOvertimeAndViolations(
    employeeId: string,
    timestamp: Date,
    type: TimeEntryType
  ): Promise<{
    isOvertime: boolean
    overtimeStatus?: OvertimeStatus
    overtimeMinutes?: number
    overtimeType?: OvertimeType
    overtimeRate?: number
    overtimeValue?: number
    exceedsLimit?: boolean
    isLate?: boolean
    lateMinutes?: number
    violatesRest?: boolean
    restHours?: number
  }> {
    // Buscar funcionário com todas as configurações
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        allowOvertime: true,
        allowOvertimeBefore: true,
        maxOvertimeBefore: true,
        allowOvertimeAfter: true,
        maxOvertimeAfter: true,
        workStartTime: true,
        workEndTime: true,
        minRestHours: true,
        warnOnRestViolation: true,
        companyId: true,
      },
    });

    if (!employee) {
      return { isOvertime: false };
    }

    // Buscar tolerâncias da empresa
    const company = await this.prisma.company.findUnique({
      where: { id: employee.companyId },
      select: {
        lateArrivalToleranceMinutes: true,
      },
    });

    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const currentMinutes = hour * 60 + minute;

    // Converter horários de trabalho para minutos
    const [startHour, startMin] = employee.workStartTime.split(':').map(Number);
    const [endHour, endMin] = employee.workEndTime.split(':').map(Number);
    const workStartMinutes = startHour * 60 + startMin;
    const workEndMinutes = endHour * 60 + endMin;

    const result: any = {
      isOvertime: false,
      isLate: false,
      violatesRest: false,
    };

    // ========================================
    // 1. VERIFICAR VIOLAÇÃO DE DESCANSO (11h)
    // ========================================
    if (type === TimeEntryType.CLOCK_IN && employee.warnOnRestViolation) {
      const lastEntry = await this.prisma.timeEntry.findFirst({
        where: {
          employeeId,
          type: TimeEntryType.CLOCK_OUT,
          timestamp: { lt: timestamp },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (lastEntry) {
        const diffMs = timestamp.getTime() - lastEntry.timestamp.getTime();
        const restHours = diffMs / (1000 * 60 * 60);
        
        if (restHours < employee.minRestHours) {
          result.violatesRest = true;
          result.restHours = restHours;
          this.logger.warn(
            `⚠️ [DESCANSO] Funcionário teve apenas ${restHours.toFixed(1)}h de descanso (mínimo: ${employee.minRestHours}h)`
          );
        }
      }
    }

    // ========================================
    // 2. DETECTAR ATRASO (CLOCK_IN)
    // ========================================
    if (type === TimeEntryType.CLOCK_IN) {
      const minutesLate = currentMinutes - workStartMinutes;
      const lateTolerance = company?.lateArrivalToleranceMinutes || 15;

      if (minutesLate > lateTolerance) {
        result.isLate = true;
        result.lateMinutes = minutesLate - lateTolerance;
        this.logger.log(
          `⏰ [ATRASO] Detectado: ${result.lateMinutes}min (tolerância: ${lateTolerance}min)`
        );
      }
    }

    // ========================================
    // 3. DETECTAR HORA EXTRA
    // ========================================
    if (!employee.allowOvertime) {
      return result;
    }

    // HORA EXTRA ANTES (CLOCK_IN)
    if (type === TimeEntryType.CLOCK_IN && employee.allowOvertimeBefore) {
      const minutesBefore = workStartMinutes - currentMinutes;
      
      if (minutesBefore > 0) {
        const overtimeMinutes = minutesBefore;
        const maxAllowed = employee.maxOvertimeBefore || 120;
        
        result.isOvertime = true;
        result.overtimeMinutes = overtimeMinutes;
        result.overtimeType = OvertimeType.BEFORE;
        result.overtimeStatus = OvertimeStatus.PENDING;
        result.exceedsLimit = overtimeMinutes > maxAllowed;

        this.logger.log(
          `⏰ [HORA EXTRA ANTES] ${overtimeMinutes}min (limite: ${maxAllowed}min) ${result.exceedsLimit ? '⚠️ EXCEDEU!' : '✅'}`
        );
      }
    }

    // HORA EXTRA DEPOIS (CLOCK_OUT)
    if (type === TimeEntryType.CLOCK_OUT && employee.allowOvertimeAfter) {
      const minutesAfter = currentMinutes - workEndMinutes;
      
      if (minutesAfter > 0) {
        const overtimeMinutes = minutesAfter;
        const maxAllowed = employee.maxOvertimeAfter || 120;
        
        result.isOvertime = true;
        result.overtimeMinutes = overtimeMinutes;
        result.overtimeType = OvertimeType.AFTER;
        result.overtimeStatus = OvertimeStatus.PENDING;
        result.exceedsLimit = overtimeMinutes > maxAllowed;

        this.logger.log(
          `⏰ [HORA EXTRA DEPOIS] ${overtimeMinutes}min (limite: ${maxAllowed}min) ${result.exceedsLimit ? '⚠️ EXCEDEU!' : '✅'}`
        );
      }
    }

    // ========================================
    // 4. CALCULAR VALOR DA HORA EXTRA (se houver)
    // ========================================
    if (result.isOvertime && result.overtimeMinutes) {
      try {
        const overtimeCalc = await this.complianceService.calculateOvertimeValue(
          employeeId,
          result.overtimeMinutes,
          timestamp,
          result.overtimeType,
        );

        result.overtimeRate = overtimeCalc.rate;
        result.overtimeValue = overtimeCalc.value;

        this.logger.log(
          `💰 [VALOR] Hora extra: ${result.overtimeMinutes}min × R$ ${overtimeCalc.hourlyRate.toFixed(2)}/h × ${overtimeCalc.rate}x = R$ ${overtimeCalc.value.toFixed(2)}`
        );
      } catch (error) {
        this.logger.error(`❌ [VALOR] Erro ao calcular valor da hora extra: ${error.message}`);
        // Não bloqueia o registro se falhar o cálculo
      }
    }

    return result;
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

    // Emitir evento WebSocket
    this.eventsGateway.emitFaceDeleted(companyId, employeeId)

    return {
      success: true,
      message: 'Face excluída com sucesso',
    }
  }

  /**
   * List all time entries for a company (for admin dashboard)
   */
  async listarTodosRegistros(
    companyId: string,
    employeeId?: string,
    dataInicio?: Date,
    dataFim?: Date,
    limit?: number,
  ) {
    const where: any = {
      companyId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

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
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return timeEntries;
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
