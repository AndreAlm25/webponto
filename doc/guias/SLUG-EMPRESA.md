# 🏷️ Sistema de Slug para Empresas

## O que é Slug?

**Slug** é um identificador amigável usado na URL, derivado do nome da empresa.

**Exemplos**:
- `"ACME Tech Ltda"` → `"acme-tech-ltda"`
- `"Minha Empresa S/A"` → `"minha-empresa-sa"`

## Por que usar Slug?

### ✅ Vantagens
- **URL amigável**: `/admin/acme-tech` ao invés de `/admin/uuid-longo`
- **SEO**: URLs legíveis são melhores para busca
- **UX**: Usuário identifica a empresa pela URL

### ⚠️ Segurança
- **DEVE ser único** no banco de dados (`@unique`)
- **Busca por slug** deve validar que pertence ao usuário logado
- **Nunca confiar apenas no slug** da URL sem validação

## Schema Prisma

```prisma
model Company {
  id    String  @id @default(uuid()) @db.Uuid
  slug  String? @unique              // ✅ Único no banco
  cnpj  String  @unique
  // ... resto
}
```

## Geração de Slug

### Regras
1. **Lowercase**: Tudo em minúsculas
2. **Remove acentos**: `São Paulo` → `sao paulo`
3. **Remove caracteres especiais**: `Ltda.` → `ltda`
4. **Substitui espaços por hífen**: `acme tech` → `acme-tech`
5. **Remove hífens duplicados**: `acme--tech` → `acme-tech`

### Função de Geração (TypeScript)

```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')                    // Remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')        // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')                // Espaços → hífens
    .replace(/-+/g, '-')                 // Remove hífens duplicados
}
```

**Exemplos**:
```typescript
generateSlug("ACME Tech Ltda")        // "acme-tech-ltda"
generateSlug("São Paulo S/A")         // "sao-paulo-sa"
generateSlug("Empresa & Cia.")        // "empresa-cia"
```

## Cadastro de Empresa

### Backend: Auto-gerar slug

```typescript
// companies.service.ts
async create(data: CreateCompanyDto) {
  // Gera slug a partir do tradeName
  let slug = generateSlug(data.tradeName)
  
  // Verifica se já existe
  let counter = 1
  while (await this.prisma.company.findUnique({ where: { slug } })) {
    slug = `${generateSlug(data.tradeName)}-${counter}`
    counter++
  }
  
  return this.prisma.company.create({
    data: {
      ...data,
      slug
    }
  })
}
```

### Frontend: Não precisa enviar slug

O slug é gerado automaticamente no backend.

## Rotas que usam Slug

### Admin (empresa logada)
- `/admin/{slug}/dashboard`
- `/admin/{slug}/geofences`
- `/admin/{slug}/employees`
- `/admin/{slug}/reports`

### Funcionário (bater ponto)
- `/{slug}/{employee}`
- Exemplo: `/acme-tech/joao-silva`

## Validação de Segurança

### Backend: Sempre validar slug

```typescript
@Get(':slug/geofences')
async listGeofences(
  @Param('slug') slug: string,
  @CurrentUser() user: User
) {
  // 1. Busca empresa pelo slug
  const company = await this.prisma.company.findUnique({
    where: { slug }
  })
  
  if (!company) {
    throw new NotFoundException('Empresa não encontrada')
  }
  
  // 2. Valida que usuário pertence à empresa
  if (user.companyId !== company.id) {
    throw new ForbiddenException('Acesso negado')
  }
  
  // 3. Retorna dados
  return this.geofencesService.list(company.id)
}
```

### Frontend: Usar slug do usuário logado

```typescript
// Buscar dados do usuário ao fazer login
const { data } = await fetch('/api/auth/me')
const slug = data.company.slug

// Redirecionar para painel
router.push(`/admin/${slug}/dashboard`)
```

## Migração de Dados Existentes

### SQL: Gerar slugs para empresas sem slug

```sql
-- Gerar slug a partir do tradeName
UPDATE companies 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(trade_name, '[áàâãäå]', 'a', 'gi'),
      '[^a-z0-9\s-]', '', 'gi'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Resolver duplicatas (adiciona sufixo numérico)
WITH duplicates AS (
  SELECT slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM companies
  WHERE slug IS NOT NULL
)
UPDATE companies c
SET slug = c.slug || '-' || d.rn
FROM duplicates d
WHERE c.slug = d.slug AND d.rn > 1;
```

## Exemplo Completo

### 1. Criar empresa

```bash
curl -X POST http://localhost:4000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "tradeName": "ACME Tech Ltda",
    "cnpj": "12345678000190",
    "email": "contato@acme.com"
  }'
```

**Response**:
```json
{
  "id": "uuid-da-empresa",
  "slug": "acme-tech-ltda",
  "tradeName": "ACME Tech Ltda",
  "cnpj": "12345678000190"
}
```

### 2. Login retorna slug

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "senha123"
  }'
```

**Response**:
```json
{
  "accessToken": "...",
  "user": {
    "id": "...",
    "company": {
      "id": "uuid-da-empresa",
      "slug": "acme-tech-ltda",
      "tradeName": "ACME Tech Ltda"
    }
  }
}
```

### 3. Acessar painel

```
http://localhost:3000/admin/acme-tech-ltda/dashboard
```

## Troubleshooting

### Erro: "Empresa não encontrada"

**Causa**: Slug não existe no banco ou está incorreto

**Solução**: Verificar slug no banco
```sql
SELECT id, slug, trade_name FROM companies;
```

### Erro: "Acesso negado"

**Causa**: Usuário tentando acessar empresa de outro

**Solução**: Validar que `user.companyId === company.id`

### Slug duplicado

**Causa**: Tentativa de criar empresa com slug existente

**Solução**: Backend adiciona sufixo numérico automaticamente
- `acme-tech` → `acme-tech-2` → `acme-tech-3`

## Resumo

1. ✅ **Slug é único** (`@unique` no schema)
2. ✅ **Gerado automaticamente** no backend
3. ✅ **Usado em todas as rotas** admin e funcionário
4. ✅ **Validação de segurança** sempre verifica `companyId`
5. ✅ **Retornado no login** para uso no frontend
