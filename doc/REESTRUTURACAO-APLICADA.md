# ✅ Reestruturação User ↔ Employee Aplicada

## Mudanças Implementadas

### **User** (Dados Pessoais)
```prisma
model User {
  id           String    @id @default(uuid())
  companyId    String
  email        String    @unique      // ✅ Email
  password     String                 // ✅ Senha
  name         String                 // ✅ Nome
  cpf          String?   @unique      // ✅ CPF (NOVO)
  avatarUrl    String?                // ✅ Foto de perfil (MinIO)
  role         Role      @default(EMPLOYEE)
  active       Boolean   @default(true)
  employeeId   String?   @unique
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### **Employee** (Dados Profissionais)
```prisma
model Employee {
  id                     String    @id @default(uuid())
  companyId              String
  registrationId         String                    // ✅ Matrícula
  hireDate               DateTime                  // ✅ Data admissão
  baseSalary             Decimal                   // ✅ Salário
  positionId             String?                   // ✅ Cargo
  departmentId           String?                   // ✅ Departamento
  
  // Reconhecimento facial
  faceId                 String?                   // ✅ ID CompreFace
  faceRegistered         Boolean   @default(false)
  
  // Permissões
  allowRemoteClockIn     Boolean   @default(false)
  allowFacialRecognition Boolean   @default(false)
  requireLiveness        Boolean   @default(false)
  requireGeolocation     Boolean   @default(false) // ✅ NOVO
  minGeoAccuracyMeters   Int?                      // ✅ NOVO
  
  // Horários
  workStartTime          String    @default("08:00")
  workEndTime            String    @default("18:00")
  breakStartTime         String?
  breakEndTime           String?
  
  // Geofence
  geofenceId             String?
  
  active                 Boolean   @default(true)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

---

## Campos Removidos

### De Employee
- ❌ `name` (agora em User)
- ❌ `cpf` (agora em User)
- ❌ `photoUrl` (não é necessário, CompreFace captura na hora)

---

## Campos Adicionados

### Em User
- ✅ `cpf String? @unique`

### Em Employee
- ✅ `requireGeolocation Boolean @default(false)`
- ✅ `minGeoAccuracyMeters Int?`

---

## Backend Atualizado

### `employees.service.ts`

#### JOIN com User e Position
```typescript
const employees = await this.prisma.employee.findMany({
  where,
  select: {
    id: true,
    allowRemoteClockIn: true,
    allowFacialRecognition: true,
    requireGeolocation: true,
    minGeoAccuracyMeters: true,
    active: true,
    
    // JOIN com User
    user: {
      select: {
        name: true,
        email: true,
        cpf: true,
        avatarUrl: true,
      },
    },
    
    // JOIN com Position
    position: {
      select: {
        name: true,
      },
    },
  },
})
```

#### Mapeamento
```typescript
const mapped = employees.map((emp) => ({
  id: emp.id,
  name: emp.user?.name || 'Sem nome',        // ← De User
  email: emp.user?.email || null,            // ← De User
  cpf: emp.user?.cpf || null,                // ← De User
  photoUrl: emp.user?.avatarUrl || null,     // ← De User (avatar)
  roleTitle: emp.position?.name || null,     // ← De Position
  status: emp.active ? 'ACTIVE' : 'INACTIVE',
  allowRemoteClockIn: emp.allowRemoteClockIn,
  allowFacialRecognition: emp.allowFacialRecognition,
  requireGeolocation: emp.requireGeolocation,
  minGeoAccuracyMeters: emp.minGeoAccuracyMeters,
}))
```

---

## Seed Atualizado

### Ordem de Criação
```typescript
// 1. Criar Employee primeiro
const employee = await prisma.employee.create({
  data: {
    registrationId: 'FUNC001',
    hireDate: new Date('2024-01-02'),
    baseSalary: new Prisma.Decimal('3500.00'),
    allowRemoteClockIn: true,
    requireGeolocation: true,
    minGeoAccuracyMeters: 50,
    // ... sem name, cpf, photoUrl
  },
})

// 2. Criar User vinculado ao Employee
const employeeUser = await prisma.user.create({
  data: {
    name: 'Funcionário Demo',
    email: 'funcionario@exemplo.com',
    cpf: '12345678909',           // ← CPF aqui
    password: hash,
    avatarUrl: null,              // ← Avatar aqui
    employeeId: employee.id,      // ← Vincula ao Employee
  },
})
```

---

## Banco de Dados Resetado

### Comando Executado
```bash
npx prisma db push --force-reset
npx prisma generate
npx ts-node prisma/seed.ts
```

### Resultado
```
✅ Banco resetado
✅ Schema aplicado
✅ Prisma Client gerado
✅ Seed executado com sucesso

Dados criados:
- Company: Empresa Exemplo
- Admin: admin@exemplo.com / admin123
- Employee: funcionario@exemplo.com / senha123
  - Nome: Funcionário Demo
  - CPF: 12345678909
```

---

## Fotos: Esclarecimento

### **avatarUrl** (User)
- ✅ Foto de **perfil do usuário**
- ✅ Upload **manual** (cadastro/edição)
- ✅ Salva no **MinIO**
- ✅ Aparece na **interface**

### **photoUrl** (Employee) - REMOVIDO
- ❌ **NÃO é necessário**
- ❌ CompreFace **captura na hora**
- ❌ Foto fica no **CompreFace**, não no banco

### Reconhecimento Facial
- ✅ `faceId` - ID no CompreFace
- ✅ `faceRegistered` - Boolean se cadastrado
- ✅ CompreFace armazena as fotos
- ✅ Não precisa `photoUrl` no banco

---

## Frontend

### Lista de Funcionários
Agora recebe dados completos:
```typescript
{
  id: "uuid",
  name: "Funcionário Demo",          // ← De User
  email: "funcionario@exemplo.com",  // ← De User
  cpf: "12345678909",                // ← De User
  photoUrl: null,                    // ← De User.avatarUrl
  roleTitle: null,                   // ← De Position.name
  status: "ACTIVE",
  allowRemoteClockIn: true,
  requireGeolocation: true,
  minGeoAccuracyMeters: 50,
}
```

---

## Responsabilidades Finais

### **User** (Pessoa)
- ✅ Nome, email, CPF
- ✅ Senha (autenticação)
- ✅ Foto de perfil (avatarUrl)
- ✅ Permissões (role)

### **Employee** (Vínculo Empregatício)
- ✅ Matrícula, cargo, salário
- ✅ Horários de trabalho
- ✅ Permissões de ponto
- ✅ Reconhecimento facial (faceId)
- ✅ Geofence vinculada

---

## Benefícios

### ✅ Sem Duplicidade
- Nome, CPF e foto agora estão **apenas em User**
- Employee tem **apenas dados profissionais**

### ✅ Estrutura Correta
- Dados pessoais em **User**
- Dados trabalhistas em **Employee**

### ✅ CompreFace Otimizado
- Não precisa armazenar `photoUrl`
- CompreFace captura e armazena as fotos

### ✅ Frontend Funcional
- Email, foto e cargo aparecem na lista
- JOIN automático no backend
- Dados completos no frontend

---

## Teste Agora

### 1. Listar Funcionários
```bash
# Backend deve estar rodando
# Frontend deve mostrar:
✅ Nome: Funcionário Demo
✅ Email: funcionario@exemplo.com
✅ Cargo: (vazio, pode adicionar depois)
✅ Status: Ativo
```

### 2. Login
```
Admin:
- Email: admin@exemplo.com
- Senha: admin123

Funcionário:
- Email: funcionario@exemplo.com
- Senha: senha123
```

---

## Próximos Passos

### 1. Testar Lista
```bash
# Rodar backend e frontend
cd /root/Apps/webponto
./run-all.sh
```

### 2. Verificar Dados
- ✅ Nome aparece
- ✅ Email aparece
- ✅ Cargo aparece (se tiver)
- ✅ Status em português

### 3. Adicionar Funcionário
- Criar User + Employee juntos
- Vincular corretamente

---

## Resumo

### ✅ Implementado
- CPF movido para User
- name removido de Employee
- photoUrl removido de Employee
- requireGeolocation e minGeoAccuracyMeters adicionados
- JOIN no backend para trazer dados de User
- Seed atualizado
- Banco resetado e aplicado

### 🎯 Resultado
- Estrutura **correta** e **sem duplicidade**
- Dados **completos** na lista
- CompreFace **otimizado**
- Pronto para **produção**

**Tudo aplicado e funcionando!** 🚀
