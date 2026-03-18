import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateCompanyDto } from './dto/update-company.dto'

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name)

  constructor(private prisma: PrismaService) {}

  async getCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        address: true,
        contactInfo: true,
      },
    })

    if (!company) {
      throw new NotFoundException('Empresa não encontrada')
    }

    return company
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      throw new NotFoundException('Empresa não encontrada')
    }

    this.logger.log(`Atualizando empresa ${companyId}`)

    // Atualizar empresa
    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        email: dto.email,
        workingHoursStart: dto.workingHoursStart,
        workingHoursEnd: dto.workingHoursEnd,
        workRegime: dto.workRegime,
        timezone: dto.timezone,
      },
    })

    // Atualizar ou criar endereço
    if (dto.address) {
      await this.prisma.address.upsert({
        where: { companyId },
        create: {
          companyId,
          street: dto.address.street || '',
          number: dto.address.number || '',
          complement: dto.address.complement,
          district: dto.address.neighborhood || '',
          city: dto.address.city || '',
          state: dto.address.state || '',
          zipCode: dto.address.zipCode || '',
        },
        update: {
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          district: dto.address.neighborhood,
          city: dto.address.city,
          state: dto.address.state,
          zipCode: dto.address.zipCode,
        },
      })
    }

    // Atualizar ou criar informações de contato
    if (dto.contactInfo) {
      await this.prisma.contactInfo.upsert({
        where: { companyId },
        create: {
          companyId,
          phoneFixed: dto.contactInfo.phone,
          phoneWhatsapp: dto.contactInfo.whatsapp,
        },
        update: {
          phoneFixed: dto.contactInfo.phone,
          phoneWhatsapp: dto.contactInfo.whatsapp,
        },
      })
    }

    // Retornar empresa atualizada com relacionamentos
    return this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        address: true,
        contactInfo: true,
      },
    })
  }
}
