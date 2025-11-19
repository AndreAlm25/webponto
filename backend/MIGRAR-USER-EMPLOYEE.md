# 🔄 Migração User ↔ Employee

## Mudanças no Schema

### ✅ Implementado

#### **User**
- ✅ Adicionado `cpf String? @unique`

#### **Employee**
- ❌ Removido `name String`
- ❌ Removido `cpf String @unique`
- ❌ Removido `photoUrl String?`
- ✅ Adicionado `requireGeolocation Boolean @default(false)`
- ✅ Adicionado `minGeoAccuracyMeters Int?`

---

## Passos para Aplicar

### 1. Gerar Migration do Prisma

```bash
cd /root/Apps/webponto/backend
npx prisma migrate dev --name restructure_user_employee
```

**O que vai fazer**:
- Adicionar coluna `cpf` em `users`
- Remover colunas `name`, `cpf`, `photoUrl` de `employees`
- Adicionar colunas `requireGeolocation`, `minGeoAccuracyMeters` em `employees`

### 2. Migração de Dados (Antes de Remover Colunas)

**IMPORTANTE**: Se já tem dados no banco, precisa migrar antes:

```sql
-- 1. Copiar CPF de Employee para User
UPDATE users u
SET cpf = e.cpf
FROM employees e
WHERE u.employee_id = e.id AND e.cpf IS NOT NULL;

-- 2. Garantir que todos os Users têm name
-- (já tem, não precisa copiar)

-- 3. Copiar photoUrl de Employee para User.avatarUrl (se necessário)
UPDATE users u
SET avatar_url = e.photo_url
FROM employees e
WHERE u.employee_id = e.id 
  AND e.photo_url IS NOT NULL 
  AND (u.avatar_url IS NULL OR u.avatar_url = '');
```

### 3. Gerar Prisma Client

```bash
npx prisma generate
```

---

## Comandos Completos

### Opção 1: Reset Completo (Perde Dados)

```bash
cd /root/Apps/webponto/backend

# Reset do banco (CUIDADO: apaga tudo)
npx prisma migrate reset --force

# Gera client
npx prisma generate
```

### Opção 2: Migração Segura (Preserva Dados)

```bash
cd /root/Apps/webponto/backend

# 1. Criar migration
npx prisma migrate dev --name restructure_user_employee

# 2. Se der erro de dados, rodar SQL de migração manualmente
# (copiar CPF, photoUrl, etc)

# 3. Gerar client
npx prisma generate
```

---

## Verificação

Após aplicar, verificar:

```bash
# Ver estrutura das tabelas
npx prisma studio
```

**Verificar**:
- ✅ `users.cpf` existe
- ✅ `employees.name` NÃO existe
- ✅ `employees.cpf` NÃO existe
- ✅ `employees.photoUrl` NÃO existe
- ✅ `employees.requireGeolocation` existe
- ✅ `employees.minGeoAccuracyMeters` existe

---

## Impacto no Código

### Backend

#### ✅ Já Atualizado
- `employees.service.ts` - JOIN com User para trazer name, cpf, avatarUrl

#### ⚠️ Verificar Outros Arquivos
Buscar por referências a:
- `employee.name` → Mudar para `employee.user.name`
- `employee.cpf` → Mudar para `employee.user.cpf`
- `employee.photoUrl` → Mudar para `employee.user.avatarUrl`

```bash
# Buscar referências
cd /root/Apps/webponto/backend
grep -r "employee\.name" src/
grep -r "employee\.cpf" src/
grep -r "employee\.photoUrl" src/
```

### Frontend

#### ✅ Já Atualizado
- `EmployeeList.tsx` - Recebe dados já mapeados do backend
- `AddEmployeeModal.tsx` - Cria com campos básicos

#### ⚠️ Verificar
- Outros componentes que usam Employee

---

## Rollback (Se Necessário)

Se algo der errado:

```bash
cd /root/Apps/webponto/backend

# Voltar para última migration
npx prisma migrate resolve --rolled-back <migration_name>

# Ou reset completo
npx prisma migrate reset --force
```

---

## Resumo

### Antes ❌
```typescript
Employee {
  name: "João Silva"
  cpf: "123.456.789-00"
  photoUrl: "https://..."
}

User {
  name: "João Silva"  // Duplicado
  email: "joao@empresa.com"
  avatarUrl: null
}
```

### Depois ✅
```typescript
Employee {
  // Sem name, cpf, photoUrl
  allowRemoteClockIn: true
  requireGeolocation: true
  minGeoAccuracyMeters: 50
}

User {
  name: "João Silva"
  cpf: "123.456.789-00"
  email: "joao@empresa.com"
  avatarUrl: "https://..."  // Foto de perfil
}
```

---

## Próximos Passos

1. ✅ Rodar migration
2. ✅ Gerar Prisma Client
3. ✅ Testar listagem de funcionários
4. ✅ Testar criação de funcionário
5. ✅ Verificar reconhecimento facial

**Pronto para aplicar!** 🚀
