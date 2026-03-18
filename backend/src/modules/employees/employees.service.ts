import { Injectable, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { EventsGateway } from '../../events/events.gateway'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import * as bcrypt from 'bcrypt'

// Serviço de funcionários
// - Fornece status de reconhecimento facial do funcionário
@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // Retornar status facial do funcionário
  // - hasFace: boolean se está cadastrado
  // - faceId: identificador externo
  // - photoUrl: última foto vinculada
  async getFacialStatus(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        faceId: true,
        faceRegistered: true,
        companyId: true,
      },
    })

    if (!employee) {
      return {
        success: false,
        message: 'Funcionário não encontrado',
        hasFace: false,
      }
    }

    return {
      success: true,
      employeeId: employee.id,
      companyId: employee.companyId,
      hasFace: !!employee.faceRegistered || !!employee.faceId,
      faceId: employee.faceId || null,
    }
  }

  // Criar funcionário (User + Employee juntos)
  async createEmployee(dto: CreateEmployeeDto) {
    // Comentário: Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (existingUser) {
      throw new ConflictException('Já existe um usuário com este email')
    }

    // Comentário: Verificar se CPF já existe (se fornecido)
    if (dto.cpf) {
      const existingCpf = await this.prisma.user.findUnique({
        where: { cpf: dto.cpf },
      })
      if (existingCpf) {
        throw new ConflictException('Já existe um usuário com este CPF')
      }
    }

    // Comentário: Hash da senha
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    // Comentário: Criar em transação para garantir atomicidade
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Criar Employee primeiro
      const employee = await tx.employee.create({
        data: {
          companyId: dto.companyId,
          registrationId: dto.registrationId,
          hireDate: new Date(dto.hireDate),
          baseSalary: dto.baseSalary,
          positionId: dto.positionId || null,
          departmentId: dto.departmentId || null,
          geofenceId: dto.geofenceId || null,
          workStartTime: dto.workStartTime,
          workEndTime: dto.workEndTime,
          breakStartTime: dto.breakStartTime || null,
          breakEndTime: dto.breakEndTime || null,
          allowRemoteClockIn: dto.allowRemoteClockIn || false,
          allowFacialRecognition: dto.allowFacialRecognition || false,
          requireLiveness: dto.requireLiveness || false,
          active: true,
        },
      })

      // 2. Criar User vinculado ao Employee
      const user = await tx.user.create({
        data: {
          companyId: dto.companyId,
          email: dto.email,
          name: dto.name,
          cpf: dto.cpf || null,
          phone: dto.phone || null,
          password: hashedPassword,
          role: 'EMPLOYEE',
          employeeId: employee.id,
          active: true,
        },
      })

      return { employee, user }
    })

    // Emitir evento WebSocket
    this.eventsGateway.emitEmployeeCreated(dto.companyId, result.employee);

    return {
      success: true,
      message: 'Funcionário cadastrado com sucesso',
      employee: result.employee,
      user: result.user,
    }
  }

  // Buscar funcionário por ID
  // - Retorna dados completos para edição
  async getEmployeeById(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true,
            avatarUrl: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        geofence: {
          select: {
            id: true,
            name: true,
            radiusMeters: true,
          },
        },
      },
    })

    if (!employee) {
      return null
    }

    return {
      id: employee.id,
      registrationId: employee.registrationId,
      hireDate: employee.hireDate,
      baseSalary: employee.baseSalary,
      positionId: employee.positionId,
      departmentId: employee.departmentId,
      geofenceId: employee.geofenceId,
      workStartTime: employee.workStartTime,
      workEndTime: employee.workEndTime,
      breakStartTime: employee.breakStartTime,
      breakEndTime: employee.breakEndTime,
      allowRemoteClockIn: employee.allowRemoteClockIn,
      allowFacialRecognition: employee.allowFacialRecognition,
      faceRegistered: employee.faceRegistered || false,
      faceId: employee.faceId || null,
      requireLiveness: employee.requireLiveness,
      allowOvertime: employee.allowOvertime,
      allowOvertimeBefore: employee.allowOvertimeBefore,
      maxOvertimeBefore: employee.maxOvertimeBefore,
      allowOvertimeAfter: employee.allowOvertimeAfter,
      maxOvertimeAfter: employee.maxOvertimeAfter,
      allowTimeBank: employee.allowTimeBank,
      minRestHours: employee.minRestHours,
      warnOnRestViolation: employee.warnOnRestViolation,
      workSchedule: employee.workSchedule,
      customWorkDaysPerMonth: employee.customWorkDaysPerMonth,
      useCustomBenefits: employee.useCustomBenefits,
      transportVoucherEnabled: employee.transportVoucherEnabled,
      transportVoucherRate: employee.transportVoucherRate,
      mealVoucherEnabled: employee.mealVoucherEnabled,
      mealVoucherValue: employee.mealVoucherValue,
      mealVoucherDiscount: employee.mealVoucherDiscount,
      healthInsuranceEnabled: employee.healthInsuranceEnabled,
      healthInsuranceValue: employee.healthInsuranceValue,
      dentalInsuranceEnabled: employee.dentalInsuranceEnabled,
      dentalInsuranceValue: employee.dentalInsuranceValue,
      customPaymentDay1: employee.customPaymentDay1,
      customPaymentDay2: employee.customPaymentDay2,
      customPaymentDay3: employee.customPaymentDay3,
      customPaymentDay4: employee.customPaymentDay4,
      active: employee.active,
      status: employee.active ? 'ACTIVE' : 'INACTIVE',
      companyId: employee.companyId,
      user: employee.user,
      position: employee.position,
      department: employee.department,
      geofence: employee.geofence,
    }
  }

  // Listar funcionários (opcional: por empresa)
  // - Retorna array com JOIN de User para trazer email e avatarUrl
  async listEmployees(companyId?: string) {
    // Busca funcionários, opcionalmente filtrando por empresa
    const where = companyId ? { companyId } : {}
    try {
      const employees = await this.prisma.employee.findMany({
        where,
        select: {
          id: true,
          registrationId: true,
          hireDate: true,
          baseSalary: true,
          positionId: true,
          departmentId: true,
          geofenceId: true,
          workStartTime: true,
          workEndTime: true,
          breakStartTime: true,
          breakEndTime: true,
          allowRemoteClockIn: true,
          allowFacialRecognition: true,
          faceRegistered: true,
          faceId: true,
          requireLiveness: true,
          active: true,
          companyId: true,
          // Comentário: JOIN com User para trazer nome, email, cpf, phone e avatarUrl
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              phone: true,
              avatarUrl: true,
            },
          },
          // Comentário: JOIN com Position para trazer o cargo
          position: {
            select: {
              id: true,
              name: true,
            },
          },
          // Comentário: JOIN com Department para trazer o departamento
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          // Comentário: JOIN com Geofence para trazer a cerca
          geofence: {
            select: {
              id: true,
              name: true,
              radiusMeters: true,
            },
          },
        },
      })

      // Comentário: Retornar dados completos para edição
      const mapped = employees.map((emp) => ({
        id: emp.id,
        registrationId: emp.registrationId,
        hireDate: emp.hireDate,
        baseSalary: emp.baseSalary,
        positionId: emp.positionId,
        departmentId: emp.departmentId,
        geofenceId: emp.geofenceId,
        workStartTime: emp.workStartTime,
        workEndTime: emp.workEndTime,
        breakStartTime: emp.breakStartTime,
        breakEndTime: emp.breakEndTime,
        allowRemoteClockIn: emp.allowRemoteClockIn,
        allowFacialRecognition: emp.allowFacialRecognition,
        faceRegistered: emp.faceRegistered || false,
        faceId: emp.faceId || null,
        requireLiveness: emp.requireLiveness,
        active: emp.active,
        status: emp.active ? 'ACTIVE' : 'INACTIVE',
        // Dados do User
        user: emp.user ? {
          id: emp.user.id,
          name: emp.user.name,
          email: emp.user.email,
          cpf: emp.user.cpf,
          phone: emp.user.phone,
          avatarUrl: emp.user.avatarUrl,
        } : null,
        // Dados do Position
        position: emp.position ? {
          id: emp.position.id,
          name: emp.position.name,
        } : null,
        // Dados do Department
        department: emp.department ? {
          id: emp.department.id,
          name: emp.department.name,
        } : null,
        // Dados do Geofence
        geofence: emp.geofence ? {
          id: emp.geofence.id,
          name: emp.geofence.name,
          radiusMeters: emp.geofence.radiusMeters,
        } : null,
        // Campos legados para compatibilidade com lista
        name: emp.user?.name || 'Sem nome',
        email: emp.user?.email || null,
        cpf: emp.user?.cpf || null,
        photoUrl: emp.user?.avatarUrl || null,
        roleTitle: emp.position?.name || null,
      }))

      console.log('[EmployeesService] listEmployees', { companyId: companyId || null, count: mapped.length })
      return mapped
    } catch (err) {
      // Comentário: Em caso de dados inconsistentes (UUID inválido em alguma coluna), evitamos derrubar a rota
      console.error('[EmployeesService] listEmployees ERROR:', (err as any)?.message || err)
      console.error('Full error:', JSON.stringify(err, null, 2))
      return []
    }
  }

  // Atualizar funcionário (campos permitidos)
  async updateEmployee(id: string, body: any) {
    // Buscar funcionário para obter userId
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!employee) {
      throw new Error('Funcionário não encontrado')
    }

    // Atualizar em transação
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar dados do Employee
      const employeeData: any = {}
      if (body.registrationId) employeeData.registrationId = body.registrationId
      if (body.hireDate) employeeData.hireDate = new Date(body.hireDate)
      if (body.baseSalary !== undefined) employeeData.baseSalary = body.baseSalary
      if (body.positionId !== undefined) employeeData.positionId = body.positionId || null
      if (body.departmentId !== undefined) employeeData.departmentId = body.departmentId || null
      if (body.geofenceId !== undefined) employeeData.geofenceId = body.geofenceId || null
      if (body.workStartTime) employeeData.workStartTime = body.workStartTime
      if (body.workEndTime) employeeData.workEndTime = body.workEndTime
      if (body.breakStartTime !== undefined) employeeData.breakStartTime = body.breakStartTime || null
      if (body.breakEndTime !== undefined) employeeData.breakEndTime = body.breakEndTime || null
      if (typeof body.allowRemoteClockIn === 'boolean') employeeData.allowRemoteClockIn = body.allowRemoteClockIn
      if (typeof body.allowFacialRecognition === 'boolean') employeeData.allowFacialRecognition = body.allowFacialRecognition
      if (typeof body.requireLiveness === 'boolean') employeeData.requireLiveness = body.requireLiveness
      if (typeof body.active === 'boolean') employeeData.active = body.active
      if (body.status) {
        // Converter status para active (ACTIVE = true, INACTIVE/TERMINATED = false)
        employeeData.active = body.status === 'ACTIVE'
      }
      
      // Hora extra
      if (typeof body.allowOvertime === 'boolean') employeeData.allowOvertime = body.allowOvertime
      if (typeof body.allowOvertimeBefore === 'boolean') employeeData.allowOvertimeBefore = body.allowOvertimeBefore
      if (body.maxOvertimeBefore !== undefined) employeeData.maxOvertimeBefore = body.maxOvertimeBefore
      if (typeof body.allowOvertimeAfter === 'boolean') employeeData.allowOvertimeAfter = body.allowOvertimeAfter
      if (body.maxOvertimeAfter !== undefined) employeeData.maxOvertimeAfter = body.maxOvertimeAfter
      if (typeof body.allowTimeBank === 'boolean') employeeData.allowTimeBank = body.allowTimeBank
      if (body.minRestHours !== undefined) employeeData.minRestHours = body.minRestHours
      if (typeof body.warnOnRestViolation === 'boolean') employeeData.warnOnRestViolation = body.warnOnRestViolation
      
      // Escala de trabalho
      if (body.workSchedule) employeeData.workSchedule = body.workSchedule
      if (body.customWorkDaysPerMonth !== undefined) employeeData.customWorkDaysPerMonth = body.customWorkDaysPerMonth
      
      // Benefícios individuais
      if (typeof body.useCustomBenefits === 'boolean') employeeData.useCustomBenefits = body.useCustomBenefits
      if (body.transportVoucherEnabled !== undefined) employeeData.transportVoucherEnabled = body.transportVoucherEnabled
      if (body.transportVoucherRate !== undefined) employeeData.transportVoucherRate = body.transportVoucherRate
      if (body.mealVoucherEnabled !== undefined) employeeData.mealVoucherEnabled = body.mealVoucherEnabled
      if (body.mealVoucherValue !== undefined) employeeData.mealVoucherValue = body.mealVoucherValue
      if (body.mealVoucherDiscount !== undefined) employeeData.mealVoucherDiscount = body.mealVoucherDiscount
      if (body.healthInsuranceEnabled !== undefined) employeeData.healthInsuranceEnabled = body.healthInsuranceEnabled
      if (body.healthInsuranceValue !== undefined) employeeData.healthInsuranceValue = body.healthInsuranceValue
      if (body.dentalInsuranceEnabled !== undefined) employeeData.dentalInsuranceEnabled = body.dentalInsuranceEnabled
      if (body.dentalInsuranceValue !== undefined) employeeData.dentalInsuranceValue = body.dentalInsuranceValue

      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: employeeData,
      })

      // 2. Atualizar dados do User (se fornecidos)
      let updatedUser = employee.user
      if (employee.user) {
        const userData: any = {}
        if (body.name) userData.name = body.name
        if (body.email) userData.email = body.email
        if (body.cpf !== undefined) userData.cpf = body.cpf || null
        if (body.phone !== undefined) userData.phone = body.phone || null

        if (Object.keys(userData).length > 0) {
          updatedUser = await tx.user.update({
            where: { id: employee.user.id },
            data: userData,
          })
        }
      }

      return { employee: updatedEmployee, user: updatedUser }
    })

    // Emitir evento WebSocket com dados completos (employee + user)
    const employeeWithUser = {
      ...result.employee,
      user: result.user,
    }
    this.eventsGateway.emitEmployeeUpdated(employee.companyId, employeeWithUser);

    return {
      success: true,
      message: 'Funcionário atualizado com sucesso',
      employee: result.employee,
      user: result.user,
    }
  }

  // Excluir funcionário
  async deleteEmployee(id: string) {
    // Buscar companyId antes de deletar
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!employee) {
      throw new Error('Funcionário não encontrado')
    }

    // Comentário: Exclusão em cascata agora é responsabilidade do Prisma (onDelete: Cascade)
    await this.prisma.employee.delete({ where: { id } })

    // Emitir evento WebSocket
    this.eventsGateway.emitEmployeeDeleted(employee.companyId, id);

    return { success: true }
  }

  // Vincular/Desvincular geofence ao funcionário
  async setEmployeeGeofence(id: string, geofenceId: string | null) {
    // Comentário: Se geofenceId vier definido, valida se existe
    if (geofenceId) {
      const gf = await this.prisma.geofence.findUnique({ where: { id: geofenceId } })
      if (!gf) {
        return { success: false, message: 'Geofence não encontrada' }
      }
      // Opcional: validar se companyId do employee == companyId da geofence
      const emp = await this.prisma.employee.findUnique({ where: { id }, select: { companyId: true } })
      if (!emp) return { success: false, message: 'Funcionário não encontrado' }
      if (emp.companyId !== gf.companyId) {
        return { success: false, message: 'Geofence pertence a outra empresa' }
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: { geofenceId: geofenceId ?? null },
      select: { id: true, geofenceId: true },
    })
    return { success: true, employee: updated }
  }

  // Vincular/Desvincular geofence para vários funcionários
  async setEmployeesGeofence(employeeIds: string[], geofenceId: string | null) {
    // Sanitizar lista
    const ids = Array.isArray(employeeIds) ? employeeIds.filter(Boolean) : []
    if (ids.length === 0) return { success: false, message: 'Lista de funcionários vazia' }

    // Se houver geofence, validar existência
    let gf: { id: string; companyId: string } | null = null
    if (geofenceId) {
      gf = await this.prisma.geofence.findUnique({ where: { id: geofenceId }, select: { id: true, companyId: true } })
      if (!gf) return { success: false, message: 'Geofence não encontrada' }
    }

    // Validar que todos os funcionários existem e (quando houver geofence) pertencem à mesma empresa da geofence
    const emps = await this.prisma.employee.findMany({ where: { id: { in: ids } }, select: { id: true, companyId: true } })
    if (emps.length !== ids.length) return { success: false, message: 'Um ou mais funcionários não encontrados' }
    if (gf) {
      const diffCompany = emps.find((e) => e.companyId !== gf!.companyId)
      if (diffCompany) return { success: false, message: 'Geofence pertence a outra empresa' }
    }

    const result = await this.prisma.employee.updateMany({
      where: { id: { in: ids } },
      data: { geofenceId: geofenceId ?? null },
    })
    return { success: true, updatedCount: result.count }
  }
}
