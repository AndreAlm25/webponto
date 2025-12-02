/**
 * 01 - Base Seed
 * Cria empresas, usuários e funcionários a partir do seed.json
 * Inclui upload de imagens (logos e avatares) para o MinIO
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as fs from 'fs'
import * as path from 'path'
import * as Minio from 'minio'

// CommonJS import para sharp
const sharp = require('sharp')

// Caminho para os dados estáticos
const SEED_DATA_PATH = path.join(__dirname, '../../seed-data')
const SEED_JSON_PATH = path.join(SEED_DATA_PATH, 'seed.json')

// Configuração do MinIO (lê das variáveis de ambiente)
function getMinioClient(): Minio.Client {
  const isPublic = !!process.env.S3_PUBLIC_ENDPOINT
  const endPoint = (isPublic
    ? process.env.S3_PUBLIC_ENDPOINT
    : process.env.S3_INTERNAL_ENDPOINT) || 
    process.env.MINIO_ENDPOINT || 'localhost'

  let port: number | undefined = undefined
  if (isPublic) {
    const publicPort = process.env.S3_PUBLIC_PORT
    port = publicPort ? parseInt(publicPort, 10) : undefined
  } else {
    const internalPort = process.env.S3_INTERNAL_PORT || process.env.MINIO_PORT || '9000'
    port = parseInt(internalPort, 10)
  }

  const useSSL = isPublic
    ? process.env.S3_PUBLIC_USE_SSL === 'true'
    : process.env.S3_INTERNAL_USE_SSL === 'true' || process.env.MINIO_USE_SSL === 'true'

  const accessKey = process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || 'minioadmin'
  const secretKey = process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || 'minioadmin123'

  return new Minio.Client({
    endPoint,
    ...(port ? { port } : {}),
    useSSL,
    accessKey,
    secretKey,
  })
}

// Bucket padrão
function getBucketName(): string {
  return process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'webponto'
}

// Garantir que o bucket existe
async function ensureBucket(client: Minio.Client, bucketName: string): Promise<void> {
  try {
    const exists = await client.bucketExists(bucketName)
    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1')
      console.log(`    ✓ Bucket criado: ${bucketName}`)
    }
  } catch (error) {
    console.error(`    ✗ Erro ao verificar/criar bucket:`, error)
  }
}

// Upload de imagem para o MinIO
async function uploadImage(
  client: Minio.Client,
  bucketName: string,
  filePath: string,
  destPath: string,
): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      return false
    }

    await ensureBucket(client, bucketName)

    const buffer = fs.readFileSync(filePath)
    // Redimensionar para 500px de largura mantendo proporção
    const resized = await sharp(buffer).resize({ width: 500 }).toBuffer()
    
    const ext = path.extname(filePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'

    const metadata = {
      'Content-Type': mime,
      'Upload-Date': new Date().toISOString(),
    }

    await client.putObject(bucketName, destPath, resized, resized.length, metadata)
    return true
  } catch (error) {
    console.error(`    ✗ Erro ao fazer upload de ${filePath}:`, error)
    return false
  }
}

interface SeedData {
  companies: CompanyData[]
}

interface CompanyData {
  cnpj: string
  legalName: string
  tradeName: string
  email: string
  plan?: string
  logoImage?: string
  address?: AddressData
  contactInfo?: ContactInfoData
  user?: UserData
  employees?: EmployeeData[]
}

interface AddressData {
  zipCode: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  reference?: string
}

interface ContactInfoData {
  phoneFixed?: string
  phoneWhatsapp?: string
  allowWhatsappNotifications?: boolean
}

interface UserData {
  email: string
  name: string
  password: string
  role?: string
}

interface EmployeeData {
  user: UserData
  employee: {
    registrationId: string
    cpf?: string
    hireDate: string
    baseSalary: string
    position?: string
    department?: string
    active?: boolean
  }
  address?: AddressData
  contactInfo?: ContactInfoData
  avatarImage?: string
}

export async function seedBase(prisma: PrismaClient): Promise<void> {
  // Verificar se o arquivo existe
  if (!fs.existsSync(SEED_JSON_PATH)) {
    throw new Error(`Arquivo não encontrado: ${SEED_JSON_PATH}`)
  }

  const raw = fs.readFileSync(SEED_JSON_PATH, 'utf-8')
  const data: SeedData = JSON.parse(raw)

  console.log(`  → Encontradas ${data.companies.length} empresas no seed.json`)

  // Inicializar cliente MinIO
  const minioClient = getMinioClient()
  const bucketName = getBucketName()

  for (const companyData of data.companies) {
    await createCompany(prisma, companyData, minioClient, bucketName)
  }

  // Log de resumo
  const companies = await prisma.company.findMany({ include: { employees: true } })
  console.log('\n  📊 Resumo:')
  for (const company of companies) {
    console.log(`    • ${company.tradeName}: ${company.employees.length} funcionários`)
  }
}

async function createCompany(
  prisma: PrismaClient,
  data: CompanyData,
  minioClient: Minio.Client,
  bucketName: string,
): Promise<void> {
  console.log(`  → Criando empresa: ${data.tradeName}`)

  // Criar empresa
  const company = await prisma.company.create({
    data: {
      cnpj: data.cnpj,
      legalName: data.legalName,
      tradeName: data.tradeName,
      email: data.email,
      active: true,
      plan: (data.plan as any) ?? 'TRIAL',
      status: 'ACTIVE',
    },
  })

  // Criar endereço da empresa
  if (data.address) {
    await prisma.address.create({
      data: {
        companyId: company.id,
        zipCode: data.address.zipCode,
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement ?? null,
        district: data.address.district,
        city: data.address.city,
        state: data.address.state,
        reference: data.address.reference ?? null,
      },
    })
  }

  // Criar contato da empresa
  if (data.contactInfo) {
    await prisma.contactInfo.create({
      data: {
        companyId: company.id,
        phoneFixed: data.contactInfo.phoneFixed ?? null,
        phoneWhatsapp: data.contactInfo.phoneWhatsapp ?? null,
        allowWhatsappNotifications: !!data.contactInfo.allowWhatsappNotifications,
      },
    })
  }

  // Criar usuário admin da empresa
  if (data.user) {
    const passwordHash = await bcrypt.hash(data.user.password, 10)
    await prisma.user.create({
      data: {
        email: data.user.email,
        name: data.user.name,
        password: passwordHash,
        role: (data.user.role as any) ?? 'COMPANY_ADMIN',
        companyId: company.id,
        active: true,
      },
    })
    console.log(`    ✓ Admin: ${data.user.email}`)
  }

  // Upload do logo da empresa para o MinIO
  if (data.logoImage) {
    const logoPath = path.join(SEED_DATA_PATH, data.logoImage)
    const ext = path.extname(logoPath).toLowerCase()
    const logoDestPath = `${company.id}/company/logo${ext}`
    
    const uploaded = await uploadImage(minioClient, bucketName, logoPath, logoDestPath)
    if (uploaded) {
      await prisma.company.update({
        where: { id: company.id },
        data: { logoUrl: logoDestPath } as any,
      })
      console.log(`    ✓ Logo enviado para MinIO`)
    }
  }

  // Criar funcionários
  if (data.employees && data.employees.length > 0) {
    for (const empData of data.employees) {
      await createEmployee(prisma, company.id, empData, minioClient, bucketName)
    }
  }
}

async function createEmployee(
  prisma: PrismaClient,
  companyId: string,
  data: EmployeeData,
  minioClient: Minio.Client,
  bucketName: string,
): Promise<void> {
  // Criar ou buscar cargo
  let positionId: string | undefined
  if (data.employee.position) {
    const position = await prisma.position.upsert({
      where: {
        name_companyId: { name: data.employee.position, companyId },
      },
      update: {},
      create: { name: data.employee.position, companyId },
    })
    positionId = position.id
  }

  // Criar ou buscar departamento
  let departmentId: string | undefined
  if (data.employee.department) {
    const department = await prisma.department.upsert({
      where: {
        name_companyId: { name: data.employee.department, companyId },
      },
      update: {},
      create: { name: data.employee.department, companyId },
    })
    departmentId = department.id
  }

  // Criar funcionário
  const employee = await prisma.employee.create({
    data: {
      companyId,
      registrationId: data.employee.registrationId,
      hireDate: new Date(data.employee.hireDate),
      baseSalary: parseFloat(data.employee.baseSalary),
      active: data.employee.active !== false,
      positionId,
      departmentId,
      // Configurações padrão para testes
      allowRemoteClockIn: true,
      allowFacialRecognition: true,
      requireLiveness: false,
      workStartTime: '08:00',
      workEndTime: '18:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
      allowOvertime: true,
      allowOvertimeAfter: true,
      maxOvertimeAfter: 120,
      overtimeRate: 1.5,
      weekendRate: 2.0,
    },
  })

  // Criar usuário do funcionário
  const passwordHash = await bcrypt.hash(data.user.password, 10)
  const user = await prisma.user.create({
    data: {
      email: data.user.email,
      name: data.user.name,
      cpf: data.employee.cpf ?? null,
      password: passwordHash,
      role: (data.user.role as any) ?? 'EMPLOYEE',
      companyId,
      active: true,
      employeeId: employee.id,
    },
  })

  // Criar endereço do funcionário
  if (data.address) {
    await prisma.address.create({
      data: {
        employeeId: employee.id,
        zipCode: data.address.zipCode,
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement ?? null,
        district: data.address.district,
        city: data.address.city,
        state: data.address.state,
        reference: data.address.reference ?? null,
      },
    })
  }

  // Criar contato do funcionário
  if (data.contactInfo) {
    await prisma.contactInfo.create({
      data: {
        employeeId: employee.id,
        phoneFixed: data.contactInfo.phoneFixed ?? null,
        phoneWhatsapp: data.contactInfo.phoneWhatsapp ?? null,
        allowWhatsappNotifications: !!data.contactInfo.allowWhatsappNotifications,
      },
    })
  }

  // Upload do avatar do funcionário para o MinIO
  if (data.avatarImage) {
    const avatarPath = path.join(SEED_DATA_PATH, data.avatarImage)
    const ext = path.extname(avatarPath).toLowerCase()
    // Formato: {companyId}/users/{userId}/profile.{ext}
    const avatarDestPath = `${companyId}/users/${user.id}/profile${ext}`
    
    const uploaded = await uploadImage(minioClient, bucketName, avatarPath, avatarDestPath)
    if (uploaded) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: avatarDestPath },
      })
      console.log(`      ✓ Avatar enviado para MinIO`)
    }
  }

  console.log(`    ✓ Funcionário: ${data.user.name} (${data.employee.registrationId})`)
}
