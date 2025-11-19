import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MinioService } from '../common/minio.service';
import * as fs from 'fs';
import * as path from 'path';
import { StaticSeedDto } from './dto/static-seed.dto';
// CommonJS import to ensure callable function on runtime
const sharp = require('sharp');

@Injectable()
export class SeedService {
  constructor(private prisma: PrismaService, private minio: MinioService) {}

  async seed() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Limpar dados existentes
    console.log('🗑️  Limpando dados existentes...');
    await this.prisma.timeEntry.deleteMany();
    await this.prisma.employee.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.company.deleteMany();

    // 1. Criar Empresa Global (para SUPER_ADMIN)
    console.log('🏢 Criando empresa global...');
    const companyGlobal = await this.prisma.company.create({
      data: {
        legalName: 'WebPonto Global Ltda',
        tradeName: 'WebPonto Global',
        cnpj: '00.000.000/0001-00',
        email: 'contato@webponto.com.br',
        active: true,
      },
    });

    // 2. Criar SUPER ADMIN
    console.log('👑 Criando SUPER ADMIN...');
    const superPassword = await bcrypt.hash('super123', 10);
    const superAdmin = await this.prisma.user.create({
      data: {
        email: 'superadmin@webponto.com.br',
        name: 'Super Admin',
        password: superPassword,
        role: 'SUPER_ADMIN',
        active: true,
        companyId: companyGlobal.id,
      },
    });

    // 3. Criar Empresa Teste
    console.log('🏢 Criando empresa teste...');
    const company = await this.prisma.company.create({
      data: {
        legalName: 'Empresa Teste Ltda',
        tradeName: 'Empresa Teste',
        cnpj: '12.345.678/0001-90',
        email: 'contato@empresateste.com.br',
        active: true,
      },
    });

    // 4. Criar Admin
    console.log('👤 Criando usuário admin...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await this.prisma.user.create({
      data: {
        email: 'admin@empresateste.com.br',
        name: 'Admin Master',
        password: adminPassword,
        role: 'COMPANY_ADMIN',
        active: true,
        companyId: company.id,
      },
    });

    // 5. Criar Funcionários
    console.log('👥 Criando funcionários...');
    const employeePassword = await bcrypt.hash('senha123', 10);

    // Funcionário 1
    const user1 = await this.prisma.user.create({
      data: {
        email: 'joao.silva@empresateste.com.br',
        name: 'João Silva',
        cpf: '123.456.789-00',
        password: employeePassword,
        role: 'EMPLOYEE',
        active: true,
        companyId: company.id,
      },
    });

    const employee1 = await this.prisma.employee.create({
      data: {
        registrationId: 'FUNC001',
        hireDate: new Date('2024-01-15'),
        baseSalary: 5000.0,
        companyId: company.id,
        active: true,
        faceRegistered: false,
      },
    });
    await this.prisma.user.update({ where: { id: user1.id }, data: { employeeId: employee1.id } });

    // Funcionário 2
    const user2 = await this.prisma.user.create({
      data: {
        email: 'maria.santos@empresateste.com.br',
        name: 'Maria Santos',
        cpf: '987.654.321-00',
        password: employeePassword,
        role: 'EMPLOYEE',
        active: true,
        companyId: company.id,
      },
    });

    const employee2 = await this.prisma.employee.create({
      data: {
        registrationId: 'FUNC002',
        hireDate: new Date('2024-02-01'),
        baseSalary: 4500.0,
        companyId: company.id,
        active: true,
        faceRegistered: false,
      },
    });
    await this.prisma.user.update({ where: { id: user2.id }, data: { employeeId: employee2.id } });

    // Funcionário 3
    const user3 = await this.prisma.user.create({
      data: {
        email: 'pedro.oliveira@empresateste.com.br',
        name: 'Pedro Oliveira',
        cpf: '456.789.123-00',
        password: employeePassword,
        role: 'MANAGER',
        active: true,
        companyId: company.id,
      },
    });

    const employee3 = await this.prisma.employee.create({
      data: {
        registrationId: 'FUNC003',
        hireDate: new Date('2023-11-10'),
        baseSalary: 7000.0,
        companyId: company.id,
        active: true,
        faceRegistered: false,
      },
    });
    await this.prisma.user.update({ where: { id: user3.id }, data: { employeeId: employee3.id } });

    // 6. Criar ponto de exemplo
    console.log('⏰ Criando ponto de exemplo...');
    const hoje = new Date();
    hoje.setHours(8, 0, 0, 0);

    await this.prisma.timeEntry.create({
      data: {
        companyId: company.id,
        employeeId: employee1.id,
        type: 'CLOCK_IN',
        timestamp: hoje,
        recognitionValid: true,
        similarity: 0.98,
        synchronized: true,
        status: 'VALID',
      },
    });

    return {
      success: true,
      message: 'Seed concluído com sucesso!',
      data: {
        superAdmin: {
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          password: 'super123',
        },
        empresa: {
          id: company.id,
          name: company.tradeName,
          cnpj: company.cnpj,
        },
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          password: 'admin123',
        },
        funcionarios: [
          {
            id: employee1.id,
            name: user1.name,
            email: user1.email,
            password: 'senha123',
          },
          {
            id: employee2.id,
            name: user2.name,
            email: user2.email,
            password: 'senha123',
          },
          {
            id: employee3.id,
            name: user3.name,
            email: user3.email,
            password: 'senha123',
          },
        ],
      },
    };
  }

  async seedWithStatic(dto: StaticSeedDto) {
    const { staticDir, reset = false, wipeStorage = false } = dto;
    const seedPath = path.join(staticDir, 'seed.json');
    const exists = fs.existsSync(seedPath);
    if (!exists) {
      return { success: false, message: `Arquivo não encontrado: ${seedPath}` };
    }

    try {
      if (reset) {
        await this.prisma.messageAttachment.deleteMany();
        await this.prisma.message.deleteMany();
        await this.prisma.messageThread.deleteMany();
        await this.prisma.timeEntry.deleteMany();
        await this.prisma.faceProfile.deleteMany();
        await this.prisma.notification.deleteMany();
        await this.prisma.position.deleteMany();
        await this.prisma.department.deleteMany();
        await this.prisma.employee.deleteMany();
        await this.prisma.user.deleteMany();
        await this.prisma.company.deleteMany();
      }

      const raw = fs.readFileSync(seedPath, 'utf-8');
      const data = JSON.parse(raw);
      const companies = Array.isArray(data.companies) ? data.companies : [];

      const results: any[] = [];

      for (const c of companies) {
        const created = await this.prisma.$transaction(async (tx) => {
          const company = await tx.company.create({
            data: {
              cnpj: c.cnpj,
              legalName: c.legalName,
              tradeName: c.tradeName,
              email: c.email,
              active: true,
              plan: c.plan ?? 'TRIAL',
              status: 'ACTIVE',
            },
          });

          if (c.address) {
            await (tx as any).address.create({
              data: {
                companyId: company.id,
                zipCode: c.address.zipCode,
                street: c.address.street,
                number: c.address.number,
                complement: c.address.complement ?? null,
                district: c.address.district,
                city: c.address.city,
                state: c.address.state,
                reference: c.address.reference ?? null,
              },
            });
          }

          if (c.contactInfo) {
            await (tx as any).contactInfo.create({
              data: {
                companyId: company.id,
                phoneFixed: c.contactInfo.phoneFixed ?? null,
                phoneWhatsapp: c.contactInfo.phoneWhatsapp ?? null,
                allowWhatsappNotifications: !!c.contactInfo.allowWhatsappNotifications,
              },
            });
          }

          if (c.user) {
            const passwordHash = await bcrypt.hash(c.user.password, 10);
            await tx.user.create({
              data: {
                email: c.user.email,
                name: c.user.name,
                password: passwordHash,
                role: c.user.role ?? 'COMPANY_ADMIN',
                companyId: company.id,
                active: true,
              },
            });
          }

          return company;
        });

        if (c.logoImage) {
          const logoAbs = path.join(staticDir, c.logoImage);
          if (fs.existsSync(logoAbs)) {
            const buf = fs.readFileSync(logoAbs);
            // resize to 500px width keeping aspect ratio
            const resized = await sharp(buf).resize({ width: 500 }).toBuffer();
            const ext = path.extname(logoAbs).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
            const logoPath = `${this.minio.generateCompanyLogoBasePath(created.id)}${ext}`;
            await this.minio.upload(resized, logoPath, mime, 'employees');
            await this.prisma.company.update({ where: { id: created.id }, data: { logoUrl: logoPath } as any });
          }
        }

        if (Array.isArray(c.employees)) {
          for (const e of c.employees) {
            await this.prisma.$transaction(async (tx) => {
              const passwordHash = await bcrypt.hash(e.user.password, 10);
              const user = await tx.user.create({
                data: {
                  email: e.user.email,
                  name: e.user.name,
                  cpf: e.employee?.cpf || null,
                  password: passwordHash,
                  role: e.user.role ?? 'EMPLOYEE',
                  companyId: created.id,
                  active: true,
                },
              });

              // Criar/Conectar Position e Department, se fornecidos no JSON
              let positionId: string | undefined = undefined;
              if (e.employee?.position) {
                const existingPos = await tx.position.findFirst({ where: { name: e.employee.position, companyId: created.id } });
                if (existingPos) positionId = existingPos.id;
                else {
                  const newPos = await tx.position.create({ data: { name: e.employee.position, companyId: created.id } });
                  positionId = newPos.id;
                }
              }

              let departmentId: string | undefined = undefined;
              if (e.employee?.department) {
                const existingDept = await tx.department.findFirst({ where: { name: e.employee.department, companyId: created.id } });
                if (existingDept) departmentId = existingDept.id;
                else {
                  const newDept = await tx.department.create({ data: { name: e.employee.department, companyId: created.id } });
                  departmentId = newDept.id;
                }
              }

              const employee = await tx.employee.create({
                data: {
                  companyId: created.id,
                  registrationId: e.employee.registrationId,
                  hireDate: new Date(e.employee.hireDate),
                  baseSalary: e.employee.baseSalary,
                  active: e.employee.active !== false,
                  positionId,
                  departmentId,
                },
              });
              // Vincular o User ao Employee ajustando employeeId no usuário
              await tx.user.update({ where: { id: user.id }, data: { employeeId: employee.id } });

              if (e.address) {
                await (tx as any).address.create({
                  data: {
                    employeeId: employee.id,
                    zipCode: e.address.zipCode,
                    street: e.address.street,
                    number: e.address.number,
                    complement: e.address.complement ?? null,
                    district: e.address.district,
                    city: e.address.city,
                    state: e.address.state,
                    reference: e.address.reference ?? null,
                  },
                });
              }

              if (e.contactInfo) {
                await (tx as any).contactInfo.create({
                  data: {
                    employeeId: employee.id,
                    phoneFixed: e.contactInfo.phoneFixed ?? null,
                    phoneWhatsapp: e.contactInfo.phoneWhatsapp ?? null,
                    allowWhatsappNotifications: !!e.contactInfo.allowWhatsappNotifications,
                  },
                });
              }

              if (e.avatarImage) {
                const avatarAbs = path.join(staticDir, e.avatarImage);
                if (fs.existsSync(avatarAbs)) {
                  const buf = fs.readFileSync(avatarAbs);
                  // resize to 500px width keeping aspect ratio
                  const resized = await sharp(buf).resize({ width: 500 }).toBuffer();
                  const ext = path.extname(avatarAbs).toLowerCase();
                  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
                  const userProfilePath = `${this.minio.generateUserProfileBasePath(created.id, user.id)}${ext}`;
                  await this.minio.upload(resized, userProfilePath, mime, 'employees');
                  // atualizar o avatar dentro da mesma transação
                  await tx.user.update({ where: { id: user.id }, data: { avatarUrl: userProfilePath } });
                  // Importante: não atualizar employee.photoUrl no seed estático
                }
              }
            });
          }
        }

        results.push({ id: created.id, tradeName: c.tradeName, cnpj: c.cnpj });
      }

      return { success: true, message: 'Seed estático concluído', companies: results };
    } catch (error: any) {
      return { success: false, message: 'Erro no seed estático', error: error?.message };
    }
  }
}
