# 🔐 Arquitetura de Autenticação

## Tipos de Usuários (Roles)

```typescript
enum Role {
  SUPER_ADMIN,      // Acesso total ao sistema
  COMPANY_ADMIN,    // Admin da empresa (acessa painel admin)
  MANAGER,          // Gerente (acessa painel admin com restrições)
  HR,               // RH (acessa painel admin com restrições)
  FINANCIAL,        // Financeiro (acessa painel admin com restrições)
  EMPLOYEE          // Funcionário comum (apenas bate ponto)
}
```

## Endpoints de Autenticação

### 1. `POST /api/auth/login`

**Propósito**: Fazer login e receber token JWT

**Request**:
```json
{
  "email": "admin@acme-tech.com.br",
  "password": "senha123"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-do-usuario",
    "email": "admin@acme-tech.com.br",
    "name": "João Silva",
    "role": "COMPANY_ADMIN",
    "companyId": "uuid-da-empresa",
    "company": {
      "id": "uuid-da-empresa",
      "slug": "acme-tech",           // ✅ Slug para URL
      "tradeName": "ACME Tech",
      "cnpj": "12345678000190"
    },
    "employee": null                  // Só vem se for funcionário
  }
}
```

### 2. `GET /api/auth/me`

**Propósito**: Buscar dados do usuário logado (qualquer role)

**Headers**:
```
Authorization: Bearer <token>
```

**Response**: Mesmo formato do login

**Uso**:
- ✅ Todos os tipos de usuário podem usar
- ✅ Retorna dados básicos da empresa (id, slug, tradeName, cnpj)
- ✅ Retorna employee completo se for funcionário

## Fluxo de Navegação

### COMPANY_ADMIN, MANAGER, HR, FINANCIAL

1. **Login** → Recebe `accessToken` e dados do usuário
2. **Salva no localStorage**:
   ```typescript
   localStorage.setItem('accessToken', data.accessToken)
   localStorage.setItem('user', JSON.stringify(data.user))
   ```
3. **Redireciona** para `/admin/{slug}/dashboard`
   - Exemplo: `/admin/acme-tech/dashboard`
   - Slug vem de `user.company.slug`

4. **Acessa recursos admin**:
   - `/admin/{slug}/geofences` → Gerenciar cercas
   - `/admin/{slug}/employees` → Gerenciar funcionários
   - `/admin/{slug}/reports` → Relatórios

### EMPLOYEE (Funcionário comum)

1. **Login** → Recebe `accessToken` e dados
2. **Redireciona** para `/{company}/{employee}`
   - Exemplo: `/acme-tech/joao-silva`
   - Apenas bate ponto, não acessa painel admin

### SUPER_ADMIN

1. **Login** → Recebe `accessToken`
2. **Redireciona** para `/super-admin/dashboard`
3. **Acessa recursos globais**:
   - `/super-admin/companies` → Gerenciar empresas
   - `/super-admin/users` → Gerenciar usuários
   - `/super-admin/analytics` → Analytics global

## Validação de Permissões

### Frontend

```typescript
// Verifica se usuário pode acessar painel admin
function canAccessAdmin(role: Role): boolean {
  return [
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'MANAGER',
    'HR',
    'FINANCIAL'
  ].includes(role)
}

// Verifica se usuário pode gerenciar geofences
function canManageGeofences(role: Role): boolean {
  return [
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'MANAGER'
  ].includes(role)
}
```

### Backend (Guards)

```typescript
// Guard para rotas admin
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR', 'FINANCIAL')
@Get('admin/geofences')
async listGeofences() { ... }

// Guard para rotas de funcionário
@UseGuards(JwtAuthGuard)
@Get('employee/time-entries')
async getTimeEntries(@CurrentUser() user) { ... }
```

## Dados da Empresa

### Quando vem dados completos da empresa?

**Sempre vem dados básicos** (id, slug, tradeName, cnpj):
- ✅ `/api/auth/login`
- ✅ `/api/auth/me`

**Dados completos** (logo, configurações, etc.):
- ⏳ TODO: Criar `/api/companies/profile` (apenas para admin)

### Exemplo de uso no frontend

```typescript
// Buscar dados do usuário logado
const fetchUser = async () => {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  
  // Usar slug na URL
  const slug = data.company.slug
  router.push(`/admin/${slug}/dashboard`)
}
```

## Migração do Schema

### Adicionar campo `slug` na tabela `companies`

```prisma
model Company {
  id    String @id @default(uuid()) @db.Uuid
  slug  String @unique              // ✅ Novo campo
  cnpj  String @unique
  // ... resto dos campos
}
```

### Executar migração

```bash
cd /root/Apps/webponto/backend
npx prisma db push
```

### Atualizar empresas existentes

```sql
-- Gerar slug a partir do tradeName
UPDATE companies 
SET slug = LOWER(REGEXP_REPLACE(trade_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Ou definir manualmente
UPDATE companies 
SET slug = 'acme-tech' 
WHERE cnpj = '12345678000190';
```

## Próximos Passos

1. ✅ Adicionar campo `slug` no schema
2. ✅ Atualizar `/api/auth/me` para retornar slug
3. ✅ Frontend busca companyId via `/api/auth/me`
4. ⏳ Criar Context API para dados do usuário (evitar múltiplas chamadas)
5. ⏳ Criar `/api/companies/profile` para dados completos (apenas admin)
6. ⏳ Implementar Guards de permissão no backend
