import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'webponto-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        company: true,
        employee: true,
      },
    });

    if (!user || !user.active) {
      console.error('🔥 [JWT] ❌ Usuário não encontrado ou inativo:', payload.sub);
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    console.log('[JWT] User validated:', user.email, 'employeeId:', user.employeeId, 'employee:', user.employee?.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company: user.company,
      employee: user.employee,
      employeeId: user.employee?.id || null,
    };
  }
}
