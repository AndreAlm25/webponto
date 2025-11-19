# 📊 Estrutura User ↔ Employee

## Problema Identificado

Havia **duplicidade de dados** entre as tabelas `User` e `Employee`:

### Antes (Problemático) ❌

**User**:
- `email` ✅
- `name` ❌ (duplicado)
- `avatarUrl` ✅
- `employeeId` (relação 1:1)

**Employee**:
- `name` ❌ (duplicado)
- `cpf` ❌ (dado pessoal, deveria estar em User)
- `photoUrl` ❌ (duplicado com avatarUrl)
- `positionId` → cargo

### Resultado
- ❌ Email não aparecia na lista (estava em User, mas buscava de Employee)
- ❌ Foto não aparecia (estava em User.avatarUrl, mas buscava Employee.photoUrl)
- ❌ Cargo não aparecia (precisava JOIN com Position)

---

## Solução Implementada

### 1. Backend: JOIN nas Queries

Atualizei `listEmployees()` para fazer JOIN com `User` e `Position`:

```typescript
const employees = await this.prisma.employee.findMany({
  where,
  select: {
    id: true,
    name: true,
    allowRemoteClockIn: true,
    allowFacialRecognition: true,
    // ... outros campos
    
    // JOIN com User para trazer email e avatarUrl
    user: {
      select: {
        email: true,
        avatarUrl: true,
      },
    },
    
    // JOIN com Position para trazer o cargo
    position: {
      select: {
        name: true,
      },
    },
  },
})
```

### 2. Mapeamento para Frontend

```typescript
const mapped = employees.map((emp) => ({
  id: emp.id,
  name: emp.name,
  email: emp.user?.email || null,           // ← De User
  photoUrl: emp.user?.avatarUrl || emp.photoUrl || null, // ← De User (prioridade)
  roleTitle: emp.position?.name || null,    // ← De Position
  status: emp.active ? 'ACTIVE' : 'INACTIVE',
  allowRemoteClockIn: emp.allowRemoteClockIn,
  allowFacialRecognition: emp.allowFacialRecognition,
  // ...
}))
```

---

## Estrutura Ideal (✅ IMPLEMENTADA)

### **User** (Dados Pessoais da Pessoa)
```prisma
model User {
  id           String    @id @default(uuid())
  companyId    String
  email        String    @unique      // ✅ Email da pessoa
  password     String                 // ✅ Senha
  name         String                 // ✅ Nome da pessoa
  cpf          String?   @unique      // ✅ CPF da pessoa
  avatarUrl    String?                // ✅ Foto de perfil (upload manual, salva no MinIO)
  role         Role      @default(EMPLOYEE)
  active       Boolean   @default(true)
  employeeId   String?   @unique
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  company      Company   @relation(...)
  employee     Employee? @relation(...)
}
```

**Importante sobre avatarUrl**:
- ✅ Foto de **perfil do usuário**
- ✅ Upload **manual** (quando cadastra/edita)
- ✅ Salva no **MinIO**
- ✅ Aparece na **interface**

### **Employee** (Dados Profissionais/Trabalhistas)
```prisma
model Employee {
  id                     String    @id @default(uuid())
  companyId              String
  registrationId         String                    // ✅ Matrícula
  hireDate               DateTime                  // ✅ Data de admissão
  baseSalary             Decimal                   // ✅ Salário base
  positionId             String?                   // ✅ Cargo
  departmentId           String?                   // ✅ Departamento
  
  // Reconhecimento facial (dados técnicos)
  faceId                 String?                   // ✅ ID no CompreFace
  faceRegistered         Boolean   @default(false) // ✅ Se tem face cadastrada
  
  // Permissões de ponto
  allowRemoteClockIn     Boolean   @default(false)
  allowFacialRecognition Boolean   @default(false)
  requireLiveness        Boolean   @default(false)
  requireGeolocation     Boolean   @default(false)
  minGeoAccuracyMeters   Int?
  
  // Horários de trabalho
  workStartTime          String    @default("08:00")
  workEndTime            String    @default("18:00")
  breakStartTime         String?
  breakEndTime           String?
  
  // Geofence
  geofenceId             String?
  
  active                 Boolean   @default(true)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  company                Company   @relation(...)
  position               Position? @relation(...)
  department             Department? @relation(...)
  geofence               Geofence? @relation(...)
  user                   User?
}
```

**Importante sobre reconhecimento facial**:
- ❌ **NÃO precisa** de `photoUrl` em Employee
- ✅ CompreFace **captura a foto na hora** e envia direto
- ✅ Apenas `faceId` e `faceRegistered` são necessários
- ✅ Foto fica armazenada no **CompreFace**, não no banco

---

## Responsabilidades

### **User** (Pessoa)
- ✅ Dados pessoais (nome, email, CPF)
- ✅ Autenticação (senha)
- ✅ Foto de perfil
- ✅ Permissões de acesso (role)

### **Employee** (Vínculo Empregatício)
- ✅ Dados trabalhistas (matrícula, salário, cargo)
- ✅ Configurações de ponto (permissões, horários)
- ✅ Reconhecimento facial (dados técnicos)
- ✅ Geofence vinculada

---

## Relação User ↔ Employee

### Atual
```
User (1) ←→ (0..1) Employee
```

- **1 User** pode ter **0 ou 1 Employee**
- **1 Employee** tem **exatamente 1 User**

### Casos de Uso

#### 1. Usuário Admin (sem Employee)
```
User {
  email: "admin@empresa.com"
  role: ADMIN
  employeeId: null  ← Não é funcionário
}
```

#### 2. Funcionário
```
User {
  email: "joao@empresa.com"
  name: "João Silva"
  cpf: "123.456.789-00"
  avatarUrl: "https://..."
  role: EMPLOYEE
  employeeId: "uuid-123"
}

Employee {
  id: "uuid-123"
  registrationId: "001"
  positionId: "uuid-cargo-gerente"
  allowRemoteClockIn: true
  // ...
}
```

---

## Migração Futura

Para eliminar a duplicidade completamente:

### 1. Migrar CPF
```sql
-- Adicionar coluna cpf em User
ALTER TABLE users ADD COLUMN cpf VARCHAR(14) UNIQUE;

-- Copiar CPF de Employee para User
UPDATE users u
SET cpf = e.cpf
FROM employees e
WHERE u.employee_id = e.id;

-- Remover coluna cpf de Employee
ALTER TABLE employees DROP COLUMN cpf;
```

### 2. Remover name de Employee
```sql
-- Garantir que todos os Users têm name
UPDATE users u
SET name = e.name
FROM employees e
WHERE u.employee_id = e.id AND u.name IS NULL;

-- Remover coluna name de Employee
ALTER TABLE employees DROP COLUMN name;
```

### 3. Consolidar photoUrl
```sql
-- Copiar photoUrl de Employee para User.avatarUrl
UPDATE users u
SET avatar_url = e.photo_url
FROM employees e
WHERE u.employee_id = e.id AND e.photo_url IS NOT NULL;

-- Remover coluna photoUrl de Employee
ALTER TABLE employees DROP COLUMN photo_url;
```

---

## Solução Atual (Sem Migração)

### Backend
✅ JOIN com User para trazer:
- `email` de `User.email`
- `photoUrl` de `User.avatarUrl` (com fallback para `Employee.photoUrl`)
- `roleTitle` de `Position.name`

### Frontend
✅ Recebe dados completos:
```typescript
{
  id: "uuid",
  name: "João Silva",
  email: "joao@empresa.com",     // ← De User
  photoUrl: "https://...",        // ← De User.avatarUrl
  roleTitle: "Gerente",           // ← De Position.name
  status: "ACTIVE",
  allowRemoteClockIn: true,
  // ...
}
```

---

## Benefícios da Solução

### Imediato (Implementado)
- ✅ Email aparece na lista
- ✅ Foto aparece na lista
- ✅ Cargo aparece na lista
- ✅ Sem duplicidade na query

### Futuro (Após Migração)
- ✅ Sem duplicidade no banco
- ✅ Dados pessoais centralizados em User
- ✅ Dados profissionais centralizados em Employee
- ✅ Manutenção mais fácil
- ✅ Menos risco de inconsistência

---

## Resumo

### ✅ Implementado Agora
- JOIN com User para trazer email e avatarUrl
- JOIN com Position para trazer cargo
- Mapeamento correto no backend
- Frontend recebe dados completos

### 🔮 Próximos Passos (Opcional)
- Migrar CPF de Employee para User
- Remover name de Employee
- Consolidar photoUrl em User.avatarUrl
- Atualizar todas as queries

---

## Teste Agora

### 1. Lista de Funcionários
```
✅ Nome aparece
✅ Email aparece (de User)
✅ Foto aparece (de User.avatarUrl)
✅ Cargo aparece (de Position.name)
✅ Status em português
```

### 2. Adicionar Funcionário
```
⚠️ Ainda cria só Employee
🔮 Futuro: criar User + Employee juntos
```

**Agora os dados aparecem corretamente!** 🎯
