# Correção Geocoding + Geofences UUID - 03/11/2025

## 1) RESUMO DO IMPLEMENTADO

### Frontend
✅ **AddressSearch** voltou a usar proxy do backend  
- URL: `NEXT_PUBLIC_API_URL/api/geocoding/search` (tradução: URL da API pública do Next.js / API de geocodificação / busca)
- Motivo: Navegador tem CORS bloqueado pelo Nominatim (erro 403 Forbidden)

✅ **Reverse Geocoding** voltou a usar proxy do backend  
- URL: `NEXT_PUBLIC_API_URL/api/geocoding/reverse` (tradução: geocodificação reversa)
- Removido headers redundantes (backend já envia)

### Backend
✅ **GeocodingController** melhorado com:
- **Timeout**: 30 segundos (usando AbortController nativo do Node.js)
- **Retry com backoff exponencial**: 3 tentativas (1s, 2s, 4s de espera entre tentativas)
- **Sem dependências extras**: usa `fetch` nativo + `AbortController` (Node.js 18+)
- **Logs detalhados** com emojis para fácil leitura:
  - 📍 URL da requisição
  - ⏳ Aguardando retry
  - ✅ Sucesso
  - ❌ Falha
  - 📦 Resultados

### Documentação
✅ **SQL para fix de UUID** criado em:
- `/root/Apps/webponto/doc/erros/fix-geofence-uuid.sql`
- Comandos para identificar e deletar registros inválidos

---

## 2) O QUE FALTA

- [ ] Executar SQL para corrigir UUIDs inválidos no banco
- [ ] Reiniciar backend para aplicar mudanças
- [ ] Testar busca de CEP "05880-260"
- [ ] Testar busca de endereço "Rua Bernardo Gomes de Brito, 307"
- [ ] Verificar se geofences carrega sem erro 500

---

## 3) PRÓXIMO PASSO RECOMENDADO

### Passo 1: Parar os serviços
```bash
# Pressione Ctrl+C no terminal que está rodando ./run-all.sh
```

### Passo 2: Corrigir UUIDs no banco
**OPÇÃO A - Via psql (terminal):**
```bash
# Conectar no banco
psql -U postgres -d webponto

# Identificar registros inválidos
SELECT id, name, "companyId" FROM "Geofence"
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR "companyId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

# Se tiver registros inválidos, DELETAR TODOS (reset):
TRUNCATE TABLE "Geofence" CASCADE;

# Sair
\q
```

**OPÇÃO B - Via Prisma Studio (GUI):**
```bash
# Em outro terminal
cd /root/Apps/webponto/backend
npm run prisma:studio

# Abrir: http://localhost:5555
# Navegar até tabela "Geofence"
# Deletar manualmente os registros com IDs estranhos
```

### Passo 3: Reiniciar serviços
```bash
./run-all.sh
```

### Passo 4: Testar no navegador
1. Abrir: http://localhost:3000/admin/acme-tech/geofences
2. Digitar no campo de busca: `05880-260`
3. Aguardar 700ms
4. **Esperado no console do navegador:**
   - `=== onChange CHAMADO ===`
   - `ViaCEP status: 200`
   - `ViaCEP response: {cep: '05880-260', ...}`
5. **Esperado no terminal do backend:**
   - `=== GEOCODING SEARCH CHAMADO ===`
   - `Tentativa 1/3: https://nominatim...`
   - `✅ Sucesso na tentativa 1`
   - `✅ Status: 200`
   - `📦 Resultados: X` (número de resultados)

---

## 4) ERROS CORRIGIDOS

### Erro 1: CORS bloqueado no navegador ✅
**Sintoma:**
```
Access to fetch at 'https://nominatim.openstreetmap.org/...' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' 
header is present on the requested resource.
```

**Causa:**
- Nominatim não permite chamadas diretas do browser (CORS desabilitado)

**Correção:**
- Frontend agora usa proxy do backend: `NEXT_PUBLIC_API_URL/api/geocoding/search`
- Backend faz a requisição (não tem restrição CORS server-to-server)

---

### Erro 2: Timeout no backend ✅
**Sintoma:**
```
ConnectTimeoutError: Connect Timeout Error
code: 'UND_ERR_CONNECT_TIMEOUT'
```

**Causa:**
- Firewall ou lentidão de rede do servidor bloqueando conexões ao Nominatim
- Timeout padrão muito curto (10s)

**Correção:**
- Timeout de 30s usando `AbortController` nativo
- Retry com backoff exponencial: 3 tentativas (1s, 2s, 4s)
- Se falhar 3x, retorna array vazio `[]` (sem quebrar a busca)
- Sem dependência de `undici` (usa apenas fetch nativo do Node.js 18+)

---

### Erro 3: UUID inválido no banco ⚠️ PENDENTE
**Sintoma:**
```
Error creating UUID, invalid character: expected an optional 
prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `m` at 3
```

**Causa:**
- Tabela `Geofence` tem registro com campo `id` ou `companyId` inválido
- Provavelmente "acme-tech" ou outro texto no lugar de UUID

**Correção:**
- Executar SQL de limpeza (ver arquivo em `/doc/erros/fix-geofence-uuid.sql`)
- Deletar registros inválidos ou fazer TRUNCATE completo

---

## RESUMO TÉCNICO

**Arquivos alterados:**
1. `/root/Apps/webponto/frontend/src/components/geo/AddressSearch.tsx`
2. `/root/Apps/webponto/frontend/src/app/admin/[company]/geofences/page.tsx`
3. `/root/Apps/webponto/backend/src/geocoding/geocoding.controller.ts`

**Arquivos criados:**
1. `/root/Apps/webponto/doc/erros/fix-geofence-uuid.sql`
2. `/root/Apps/webponto/doc/progresso/correcao-geocoding-2025-11-03.md` (este arquivo)

**Dependências:**
- Nenhuma dependência extra necessária
- Usa `fetch` nativo e `AbortController` do Node.js 18+
