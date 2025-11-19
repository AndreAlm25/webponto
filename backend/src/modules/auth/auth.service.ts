import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: { email: string; password?: string }) {
    const { email } = loginDto;
    const password = loginDto.password
    
    if (!password) {
      throw new UnauthorizedException('Senha é obrigatória');
    }

    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        employee: { include: { position: true, department: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou password incorretos');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo. Entre em contato com o administrador.');
    }

    // Verificar se o funcionário (employee) também está ativo
    if (user.employee && !user.employee.active) {
      throw new UnauthorizedException('Funcionário desativado. Entre em contato com o administrador.');
    }

    // Debug
    console.log('[AUTH] Usuario encontrado:', {
      id: user.id,
      email: user.email,
      temSenha: !!user.password,
      senhaLength: user.password?.length
    });

    if (!user.password) {
      throw new UnauthorizedException('Senha não configurada para este usuário');
    }

    // Verificar password
    const passwordCorrect = await bcrypt.compare(password, user.password);
    
    if (!passwordCorrect) {
      throw new UnauthorizedException('Email ou password incorretos');
    }

    // Gerar token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        avatarUrl: (user as any).avatarUrl,
        company: {
          id: user.company.id,
          slug: (user.company as any).slug || null,
          tradeName: user.company.tradeName,
          cnpj: user.company.cnpj,
          logoUrl: (user.company as any).logoUrl || null,
        },
        // Retornar employee completo (com position e department já incluídos)
        employee: user.employee ?? null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, name, password, role, companyId } = registerDto;

    // Verificar se usuário já existe
    const userExiste = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExiste) {
      throw new ConflictException('Email já cadastrado');
    }

    // Verificar se company existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new ConflictException('Empresa não encontrada');
    }

    // Regras de criação por papel (role)
    // Funcionários (inclui MANAGER, HR, FINANCIAL) DEVEM ser criados via fluxo de Employee,
    // que vincula um User automaticamente. Bloqueamos aqui para evitar inconsistência.
    if (
      role === (await import('@prisma/client')).Role.EMPLOYEE ||
      role === (await import('@prisma/client')).Role.MANAGER ||
      role === (await import('@prisma/client')).Role.HR ||
      role === (await import('@prisma/client')).Role.FINANCIAL
    ) {
      throw new ConflictException(
        'Criação inválida: colaboradores (EMPLOYEE/MANAGER/HR/FINANCIAL) devem ser criados pelo fluxo de funcionário (Employee), que vincula o usuário automaticamente.'
      );
    }

    // Hash da password
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        role,
        companyId,
        active: true,
      },
      include: {
        company: true,
      },
    });

    // Gerar token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        avatarUrl: (user as any).avatarUrl,
        company: {
          id: company.id,
          slug: (company as any).slug || null,
          tradeName: company.tradeName,
          cnpj: company.cnpj,
        },
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        employee: { include: { position: true, department: true } },
      },
    });

    if (!user || !user.active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      avatarUrl: (user as any).avatarUrl,
      company: user.company,
      // employee já contém position e department
      employee: user.employee,
    };
  }

  async me(userId: string) {
    return this.validateUser(userId);
  }
}
