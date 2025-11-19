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
          requireLiveness: true,
          requireGeolocation: true,
          minGeoAccuracyMeters: true,
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
        requireLiveness: emp.requireLiveness,
        requireGeolocation: emp.requireGeolocation,
        minGeoAccuracyMeters: emp.minGeoAccuracyMeters,
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
