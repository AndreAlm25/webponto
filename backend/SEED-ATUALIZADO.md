# ✅ Seeds Atualizados para Nova Estrutura

## Mudanças Aplicadas

### `seed.service.ts`

#### 1. Seed Simples (`seed()`)

**Antes** ❌:
```typescript
const user1 = await this.prisma.user.create({
  data: {
    email: 'joao.silva@empresateste.com.br',
    name: 'João Silva',
    // ❌ Sem CPF
  },
})

const employee1 = await this.prisma.employee.create({
  data: {
    name: 'João Silva',        // ❌ Duplicado
    cpf: '123.456.789-00',     // ❌ Deveria estar em User
    registrationId: 'FUNC001',
    // ...
  },
})
```

**Depois** ✅:
```typescript
const user1 = await this.prisma.user.create({
  data: {
    email: 'joao.silva@empresateste.com.br',
    name: 'João Silva',
    cpf: '123.456.789-00',     // ✅ CPF em User
  },
})

const employee1 = await this.prisma.employee.create({
  data: {
    // ✅ Sem name e cpf
    registrationId: 'FUNC001',
    hireDate: new Date('2024-01-15'),
    baseSalary: 5000.0,
    // ...
  },
})
```

---

#### 2. Seed Estático (`seedWithStatic()`)

**Antes** ❌:
```typescript
const user = await tx.user.create({
  data: {
    email: e.user.email,
    name: e.user.name,
    // ❌ Sem CPF
  },
})

const employee = await tx.employee.create({
  data: {
    name: e.user.name,         // ❌ Duplicado
    cpf: e.employee.cpf,       // ❌ Deveria estar em User
    registrationId: e.employee.registrationId,
    // ...
  },
})
```

**Depois** ✅:
```typescript
const user = await tx.user.create({
  data: {
    email: e.user.email,
    name: e.user.name,
    cpf: e.employee?.cpf || null,  // ✅ CPF em User
  },
})

const employee = await tx.employee.create({
  data: {
    // ✅ Sem name e cpf
    registrationId: e.employee.registrationId,
    hireDate: new Date(e.employee.hireDate),
    baseSalary: e.employee.baseSalary,
    // ...
  },
})
```

---

#### 3. Retorno do Seed (`seed()`)

**Antes** ❌:
```typescript
funcionarios: [
  {
    id: employee1.id,
    name: employee1.name,  // ❌ Employee não tem mais name
    email: user1.email,
  },
]
```

**Depois** ✅:
```typescript
funcionarios: [
  {
    id: employee1.id,
    name: user1.name,      // ✅ Nome de User
    email: user1.email,
  },
]
```

---

## Estrutura do JSON (`seed.json`)

### Formato Esperado

```json
{
  "companies": [
    {
      "cnpj": "45.987.321/0001-55",
      "legalName": "Acme Tecnologia do Brasil Ltda",
      "tradeName": "Acme Tech",
      "employees": [
        {
          "user": {
            "email": "joao.silva@acmetech.com.br",
            "name": "João da Silva",
            "password": "123456*",
            "role": "EMPLOYEE"
          },
          "employee": {
            "registrationId": "REG001",
            "cpf": "12345878909",           // ← CPF aqui (será movido para User)
            "hireDate": "2024-01-15",
            "baseSalary": "5200.00",
            "position": "Desenvolvedor",
            "department": "Tecnologia",
            "active": true
          },
          "avatarImage": "images/users/joao-silva.png"
        }
      ]
    }
  ]
}
```

### Como Funciona

1. **Lê o CPF** de `employee.cpf` no JSON
2. **Cria User** com `cpf` de `employee.cpf`
3. **Cria Employee** SEM `name` e `cpf`
4. **Vincula** User ao Employee

---

## Comando para Rodar

```bash
curl -X POST http://localhost:4000/api/seed/static \
  -H "Content-Type: application/json" \
  -d '{
    "staticDir": "/root/Apps/webponto/backend/seed-data",
    "reset": true,
    "wipeStorage": true
  }'
```

### Parâmetros

- `staticDir`: Caminho para a pasta com `seed.json` e imagens
- `reset`: `true` para limpar banco antes
- `wipeStorage`: `true` para limpar MinIO antes

---

## O Que o Seed Faz

### 1. Limpa o Banco (se `reset: true`)
```typescript
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
```

### 2. Cria Companies
- Lê do JSON
- Cria Company
- Cria Address (se houver)
- Cria ContactInfo (se houver)
- Faz upload do logo (se houver)

### 3. Cria Admin da Company
- Lê `company.user` do JSON
- Cria User admin
- Hash da senha

### 4. Cria Employees
Para cada `company.employees[]`:

1. **Cria User**:
   - Email, name, password, role
   - **CPF** de `employee.cpf` ✅
   - Hash da senha

2. **Cria Position** (se não existir):
   - Nome do cargo

3. **Cria Department** (se não existir):
   - Nome do departamento

4. **Cria Employee**:
   - RegistrationId, hireDate, baseSalary
   - **SEM name e cpf** ✅
   - Vincula Position e Department

5. **Vincula User ao Employee**:
   - `user.employeeId = employee.id`

6. **Cria Address** (se houver):
   - Endereço do funcionário

7. **Cria ContactInfo** (se houver):
   - Telefones do funcionário

8. **Upload Avatar** (se houver):
   - Redimensiona para 500px
   - Faz upload no MinIO
   - Atualiza `user.avatarUrl` ✅

---

## Resultado

### User
```typescript
{
  id: "uuid",
  email: "joao.silva@acmetech.com.br",
  name: "João da Silva",
  cpf: "12345878909",              // ✅ CPF aqui
  avatarUrl: "companies/.../users/.../avatar.png",  // ✅ Avatar aqui
  role: "EMPLOYEE",
  employeeId: "uuid-employee",
}
```

### Employee
```typescript
{
  id: "uuid",
  registrationId: "REG001",
  hireDate: "2024-01-15",
  baseSalary: 5200.00,
  positionId: "uuid-position",
  departmentId: "uuid-department",
  active: true,
  // ✅ SEM name, cpf, photoUrl
}
```

---

## Teste

### 1. Rodar Backend
```bash
cd /root/Apps/webponto/backend
npm run start:dev
```

### 2. Executar Seed
```bash
curl -X POST http://localhost:4000/api/seed/static \
  -H "Content-Type: application/json" \
  -d '{
    "staticDir": "/root/Apps/webponto/backend/seed-data",
    "reset": true,
    "wipeStorage": true
  }'
```

### 3. Verificar
```bash
# Abrir Prisma Studio
npx prisma studio

# Verificar:
✅ users.cpf existe e tem valores
✅ users.avatarUrl tem URLs das imagens
✅ employees NÃO tem name, cpf, photoUrl
✅ employees.positionId vinculado
✅ users.employeeId vinculado
```

---

## Benefícios

- ✅ **Sem duplicidade** de dados
- ✅ **CPF em User** (dado pessoal)
- ✅ **Avatar em User** (foto de perfil)
- ✅ **Employee limpo** (apenas dados profissionais)
- ✅ **Seed compatível** com nova estrutura

**Pronto para rodar!** 🚀
