import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HolidayType } from '@prisma/client';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos os feriados de uma empresa
   */
  async list(companyId: string, year?: number) {
    const where: any = { companyId };
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      where.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Buscar feriado por ID
   */
  async findById(id: string, companyId: string) {
    const holiday = await this.prisma.holiday.findFirst({
      where: { id, companyId },
    });

    if (!holiday) {
      throw new NotFoundException('Feriado não encontrado.');
    }

    return holiday;
  }

  /**
   * Criar novo feriado
   */
  async create(data: {
    companyId: string;
    name: string;
    date: Date;
    type?: HolidayType;
    recurring?: boolean;
    halfDay?: boolean;
    notes?: string;
  }) {
    // Verificar se já existe feriado na mesma data
    const existing = await this.prisma.holiday.findFirst({
      where: {
        companyId: data.companyId,
        date: data.date,
        name: data.name,
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe um feriado com este nome nesta data.');
    }

    return this.prisma.holiday.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        date: data.date,
        type: data.type || HolidayType.NATIONAL,
        recurring: data.recurring ?? true,
        halfDay: data.halfDay ?? false,
        notes: data.notes,
      },
    });
  }

  /**
   * Atualizar feriado
   */
  async update(
    id: string,
    companyId: string,
    data: {
      name?: string;
      date?: Date;
      type?: HolidayType;
      recurring?: boolean;
      halfDay?: boolean;
      active?: boolean;
      notes?: string;
    },
  ) {
    const holiday = await this.findById(id, companyId);

    return this.prisma.holiday.update({
      where: { id: holiday.id },
      data,
    });
  }

  /**
   * Deletar feriado
   */
  async delete(id: string, companyId: string) {
    const holiday = await this.findById(id, companyId);

    await this.prisma.holiday.delete({
      where: { id: holiday.id },
    });

    return { success: true };
  }

  /**
   * Verificar se uma data é feriado
   */
  async isHoliday(companyId: string, date: Date): Promise<boolean> {
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        companyId,
        date,
        active: true,
      },
    });

    return !!holiday;
  }

  /**
   * Buscar feriado de uma data específica
   */
  async getHolidayByDate(companyId: string, date: Date) {
    return this.prisma.holiday.findFirst({
      where: {
        companyId,
        date,
        active: true,
      },
    });
  }

  /**
   * Importar feriados nacionais brasileiros para um ano
   */
  async importNationalHolidays(companyId: string, year: number) {
    // Feriados fixos nacionais
    const fixedHolidays = [
      { name: 'Confraternização Universal', month: 0, day: 1 },
      { name: 'Tiradentes', month: 3, day: 21 },
      { name: 'Dia do Trabalho', month: 4, day: 1 },
      { name: 'Independência do Brasil', month: 8, day: 7 },
      { name: 'Nossa Senhora Aparecida', month: 9, day: 12 },
      { name: 'Finados', month: 10, day: 2 },
      { name: 'Proclamação da República', month: 10, day: 15 },
      { name: 'Natal', month: 11, day: 25 },
    ];

    // Calcular Páscoa (algoritmo de Meeus/Jones/Butcher)
    const easter = this.calculateEaster(year);
    
    // Feriados móveis baseados na Páscoa
    const mobileHolidays = [
      { name: 'Carnaval', daysFromEaster: -47 },
      { name: 'Sexta-feira Santa', daysFromEaster: -2 },
      { name: 'Corpus Christi', daysFromEaster: 60 },
    ];

    const holidaysToCreate = [];

    // Adicionar feriados fixos
    for (const h of fixedHolidays) {
      const date = new Date(year, h.month, h.day);
      holidaysToCreate.push({
        companyId,
        name: h.name,
        date,
        type: HolidayType.NATIONAL,
        recurring: true,
        halfDay: false,
      });
    }

    // Adicionar feriados móveis
    for (const h of mobileHolidays) {
      const date = new Date(easter);
      date.setDate(date.getDate() + h.daysFromEaster);
      holidaysToCreate.push({
        companyId,
        name: h.name,
        date,
        type: HolidayType.NATIONAL,
        recurring: false, // Móveis não são recorrentes (mudam de data)
        halfDay: false,
      });
    }

    // Criar feriados (ignorar duplicados)
    let created = 0;
    for (const holiday of holidaysToCreate) {
      try {
        await this.prisma.holiday.create({ data: holiday });
        created++;
      } catch (error) {
        // Ignorar erro de duplicata
      }
    }

    return { created, total: holidaysToCreate.length };
  }

  /**
   * Calcular data da Páscoa (algoritmo de Meeus/Jones/Butcher)
   */
  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }
}
