# 🔍 Debug: Logs do Slug

## Logs Adicionados

### 1. Hook `useCompanySlug` ✅

**Arquivo**: `/frontend/src/hooks/useCompanySlug.ts`

**Logs**:
```
🔍 [useCompanySlug] Iniciando validação...
🔍 [useCompanySlug] URL Slug recebido: acme-tech
✅ [useCompanySlug] Token encontrado: eyJhbGciOiJIUzI1NiIs...
🌐 [useCompanySlug] Chamando API: http://localhost:4000/api/auth/me
📡 [useCompanySlug] Status da resposta: 200
📦 [useCompanySlug] Dados completos do usuário: { ... }
🏢 [useCompanySlug] Company ID extraído: abc-123-uuid
🏷️ [useCompanySlug] Slug extraído do banco: acme-tech1
🔗 [useCompanySlug] Slug da URL atual: acme-tech
❌ [useCompanySlug] MISMATCH DETECTADO!
   URL tem: "acme-tech"
   Banco tem: "acme-tech1"
   Usuário deveria acessar: /admin/acme-tech1
🏁 [useCompanySlug] Validação finalizada
```

### 2. Layout Admin ✅

**Arquivo**: `/frontend/src/app/admin/[company]/layout.tsx`

**Logs**:
```
📐 [Layout] Layout Admin carregado
📐 [Layout] Slug recebido (params.company): acme-tech
📐 [Layout] Slug decodificado: acme-tech
📐 [Layout] User data: { id: "...", email: "...", ... }
📐 [Layout] User company: { id: "...", slug: "acme-tech1", ... }
```

### 3. Dashboard Principal ✅

**Arquivo**: `/frontend/src/app/admin/[company]/page.tsx`

**Logs**:
```
🏠 [Dashboard] Página carregada
🏠 [Dashboard] Slug da URL (params.company): acme-tech
🏠 [Dashboard] window.location.pathname: /admin/acme-tech
🏠 [Dashboard] window.location.href: http://localhost:3000/admin/acme-tech
🏠 [Dashboard] Hook useCompanySlug retornou:
   - companyId: abc-123-uuid
   - companySlug: acme-tech1
   - slugMismatch: true
   - loading: false
```

## Como Testar

### 1. Iniciar aplicação
```bash
cd /root/Apps/webponto
./run-all.sh
```

### 2. Fazer login
```
http://localhost:3000/login
```

### 3. Acessar dashboard com slug diferente do banco
```
http://localhost:3000/admin/acme-tech
```

### 4. Abrir console do navegador (F12)

Você verá todos os logs em sequência:

1. **Layout carrega** → Mostra slug da URL
2. **Dashboard carrega** → Mostra slug da URL e pathname
3. **Hook valida** → Busca dados do usuário e compara slugs
4. **Resultado** → Mostra se há mismatch

## Cenários de Teste

### Cenário 1: Slug correto

**Banco**: `slug = "acme-tech1"`  
**URL**: `/admin/acme-tech1`

**Resultado esperado**:
```
✅ [useCompanySlug] Slug da URL corresponde ao slug do usuário!
```

### Cenário 2: Slug incorreto (seu caso)

**Banco**: `slug = "acme-tech1"`  
**URL**: `/admin/acme-tech`

**Resultado esperado**:
```
❌ [useCompanySlug] MISMATCH DETECTADO!
   URL tem: "acme-tech"
   Banco tem: "acme-tech1"
   Usuário deveria acessar: /admin/acme-tech1
```

**Tela**: Exibe erro com botão "Ir para minha empresa"

### Cenário 3: Verificar slug no banco

```sql
SELECT id, slug, trade_name FROM companies;
```

**Resultado esperado**:
```
id              | slug         | trade_name
abc-123-uuid    | acme-tech1   | ACME Tech
```

## Próximos Passos

### Opção 1: Corrigir slug no banco (recomendado)

```sql
UPDATE companies 
SET slug = 'acme-tech' 
WHERE slug = 'acme-tech1';
```

Depois acesse: `http://localhost:3000/admin/acme-tech`

### Opção 2: Acessar com slug correto do banco

Se o banco tem `acme-tech1`, acesse:
```
http://localhost:3000/admin/acme-tech1
```

### Opção 3: Verificar se há redirecionamento

Verifique se há algum código que está removendo o "1" da URL:
- Middleware do Next.js
- Redirect no AuthContext
- Redirect no login

## Comandos Úteis

### Ver logs em tempo real
```bash
# Console do navegador (F12)
# Aba: Console
# Filtrar por: [useCompanySlug] ou [Layout] ou [Dashboard]
```

### Ver slug no Prisma Studio
```bash
cd /root/Apps/webponto/backend
npx prisma studio
# Abrir: http://localhost:5555
# Navegar: companies → Ver campo "slug"
```

### Verificar slug via API
```bash
# Fazer login primeiro e copiar o token
TOKEN="seu-token-aqui"

curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.company.slug'
```

## Resumo

✅ **Logs adicionados em 3 locais**:
- Hook `useCompanySlug`
- Layout Admin
- Dashboard Principal

✅ **Logs mostram**:
- Slug da URL
- Slug do banco
- Se há mismatch
- Dados completos do usuário

✅ **Próximo passo**:
1. Acessar `/admin/acme-tech` (ou o slug que você está tentando)
2. Abrir console (F12)
3. Ver logs detalhados
4. Identificar se slug do banco é diferente da URL
5. Corrigir slug no banco ou acessar URL correta

**Agora você terá visibilidade total do fluxo de validação do slug!** 🚀
