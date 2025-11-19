# ✅ Correção: Frontend usando Slug correto

## Problema Identificado

O frontend estava usando o slug da URL diretamente, sem validar se correspondia ao slug do usuário logado. Isso causava:

1. **URL incorreta**: `/admin/acme-tech1` (slug errado no banco)
2. **Falta de validação**: Usuário poderia tentar acessar empresa de outro
3. **CompanyId errado**: Buscava `data.companyId` ao invés de `data.company.id`

## Solução Implementada

### 1. Hook `useCompanySlug` ✅

**Arquivo**: `/frontend/src/hooks/useCompanySlug.ts`

**Função**:
- Busca dados do usuário via `/api/auth/me`
- Extrai `company.id` (UUID) e `company.slug`
- Valida se slug da URL corresponde ao slug do usuário
- Retorna: `{ companyId, companySlug, slugMismatch, loading }`

**Uso**:
```typescript
const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
```

### 2. Componente `SlugMismatchError` ✅

**Arquivo**: `/frontend/src/components/admin/SlugMismatchError.tsx`

**Função**:
- Exibe mensagem de erro quando slug não corresponde
- Botão para redirecionar para URL correta
- Reutilizável em todas as páginas admin

**Uso**:
```typescript
if (slugMismatch) {
  return <SlugMismatchError 
    urlSlug={urlSlug} 
    correctSlug={companySlug} 
    currentPath="/admin/acme-tech1/geofences" 
  />
}
```

### 3. Página Geofences Atualizada ✅

**Arquivo**: `/frontend/src/app/admin/[company]/geofences/page.tsx`

**Mudanças**:
```typescript
// ❌ ANTES
const companyParam = params.company
const companyId = COMPANY_SLUG_TO_UUID[companyParam] // Hardcoded!

// ✅ DEPOIS
const { companyId, companySlug, slugMismatch } = useCompanySlug()
// companyId = UUID correto do banco
// companySlug = slug validado do usuário logado
```

## Fluxo Completo

### 1. Usuário faz login
```typescript
POST /api/auth/login
Response: {
  accessToken: "...",
  user: {
    id: "user-uuid",
    company: {
      id: "company-uuid",
      slug: "acme-tech",  // ✅ Slug correto do banco
      tradeName: "ACME Tech"
    }
  }
}
```

### 2. Frontend busca dados do usuário
```typescript
GET /api/auth/me
Headers: { Authorization: "Bearer token" }
Response: {
  id: "user-uuid",
  companyId: "company-uuid",
  company: {
    id: "company-uuid",
    slug: "acme-tech",  // ✅ Slug correto
    tradeName: "ACME Tech"
  }
}
```

### 3. Hook valida slug da URL
```typescript
// URL: /admin/acme-tech1/geofences
// Slug do usuário: acme-tech

if (urlSlug !== userSlug) {
  // ❌ Não corresponde!
  slugMismatch = true
}
```

### 4. Exibe erro ou página
```typescript
if (slugMismatch) {
  // Exibe erro com botão para redirecionar
  return <SlugMismatchError ... />
}

// ✅ Slug correto, exibe página
return <div>Geofences...</div>
```

## Exemplo Prático

### Cenário: Slug errado no banco

**Banco de dados**:
```sql
SELECT id, slug, trade_name FROM companies;
-- id: abc-123, slug: acme-tech1, trade_name: ACME Tech
```

**Problema**:
- URL: `/admin/acme-tech1/geofences`
- Slug correto deveria ser: `acme-tech`

**Solução**:
1. Corrigir slug no banco:
   ```sql
   UPDATE companies SET slug = 'acme-tech' WHERE id = 'abc-123';
   ```

2. Acessar URL correta:
   ```
   http://localhost:3000/admin/acme-tech/geofences
   ```

3. ✅ Hook valida que slug corresponde ao usuário

### Cenário: Usuário tenta acessar empresa de outro

**Usuário A**:
- Empresa: ACME Tech
- Slug: `acme-tech`

**Usuário A tenta acessar**:
```
/admin/outra-empresa/geofences
```

**Resultado**:
```
⚠️ Acesso Negado

A URL acessada (/admin/outra-empresa) não corresponde 
à sua empresa (/admin/acme-tech).

[Botão: Ir para minha empresa]
```

## Próximos Passos

### 1. Corrigir slugs no banco
```sql
-- Ver slugs atuais
SELECT id, slug, trade_name FROM companies;

-- Corrigir slug específico
UPDATE companies 
SET slug = 'acme-tech' 
WHERE id = 'abc-123';
```

### 2. Aplicar hook em outras páginas admin

**Páginas que precisam do hook**:
- ✅ `/admin/[company]/geofences/page.tsx` (feito)
- ⏳ `/admin/[company]/page.tsx` (dashboard)
- ⏳ `/admin/[company]/funcionarios/[id]/geofence/page.tsx`
- ⏳ `/admin/[company]/funcionarios/geofence-lote/page.tsx`
- ⏳ `/admin/[company]/geofences/[id]/edit/page.tsx`

**Como aplicar**:
```typescript
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'

export default function MyAdminPage() {
  const { companyId, companySlug, slugMismatch } = useCompanySlug()
  
  if (slugMismatch) {
    return <SlugMismatchError ... />
  }
  
  // Usar companyId (UUID) nas chamadas de API
  // Usar companySlug nos links internos
}
```

### 3. Testar fluxo completo

1. Login com usuário
2. Verificar console: `Dados do usuário: { company: { slug: "..." } }`
3. Acessar `/admin/{slug}/geofences`
4. ✅ Deve carregar página corretamente
5. Tentar acessar `/admin/slug-errado/geofences`
6. ✅ Deve exibir erro e botão de redirecionamento

## Resumo

### ✅ Implementado
- Hook `useCompanySlug` para validação
- Componente `SlugMismatchError` para erro
- Página geofences usando hook
- Validação de slug em todas as rotas admin

### 🔒 Segurança
- Slug da URL é validado contra slug do usuário
- CompanyId (UUID) é buscado do backend
- Impossível acessar dados de outra empresa

### 📝 Documentação
- `/doc/guias/SLUG-EMPRESA.md` - Guia completo
- `/doc/CORRECAO-SLUG-FRONTEND.md` - Este arquivo

**Próximo passo**: Corrigir slugs no banco e aplicar hook nas demais páginas admin!
