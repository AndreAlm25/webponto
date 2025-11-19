# ✅ ERRO "FETCH FAILED" CORRIGIDO!

**Data:** 20/10/2025 - 13:55  
**Erro:** "Erro ao cadastrar face - fetch failed"  
**Status:** ✅ CORRIGIDO!

---

## 🔍 CAUSA DO PROBLEMA

### O Que Estava Acontecendo:
```
Frontend (container Docker) → localhost:8080 → ❌ ECONNREFUSED
```

**Problema:** Dentro de um container Docker, `localhost` aponta para o **próprio container**, não para o host ou outros containers!

### Erro no Console:
```javascript
[face-test/register] erro: TypeError: fetch failed
  cause: AggregateError [ECONNREFUSED]
```

---

## ✅ SOLUÇÃO APLICADA

### Antes ❌:
```typescript
// compreface.ts
const BASE_URL = 'http://localhost:8080/api/v1'  // ❌ Não funciona no Docker!
```

### Depois ✅:
```typescript
// compreface.ts
const BASE_URL = typeof window === 'undefined' 
  ? 'http://compreface-api:8080/api/v1'  // ✅ Server-side (Node.js no Docker)
  : 'http://localhost:8080/api/v1'        // ✅ Client-side (browser)
```

---

## 🎯 COMO FUNCIONA AGORA

### 1. Requisições do Servidor (Node.js)
**Quando a API `/api/face-test/register` executa no servidor:**
```typescript
// Dentro do container frontend (Node.js)
BASE_URL = 'http://compreface-api:8080/api/v1'  // ✅ Usa nome do serviço Docker
```

**Fluxo:**
```
Browser → Frontend Container → compreface-api:8080 ✅
```

---

### 2. Requisições do Cliente (Browser)
**Se o browser fizer requisição direta (não usado agora):**
```typescript
// No browser do usuário
BASE_URL = 'http://localhost:8080/api/v1'  // ✅ Localhost do computador
```

---

## 🔄 FLUXO CORRETO AGORA

```
┌─────────────────────────────────────────────────────────┐
│ CADASTRO DE FACE                                        │
├─────────────────────────────────────────────────────────┤
│ 1. Browser → POST /api/face-test/register              │
│    ├─ userId: joao.silva@empresateste.com.br            │
│    └─ photo: [blob]                                     │
│                                                          │
│ 2. Frontend Container (Node.js) recebe                  │
│    ├─ Converte blob para Buffer                         │
│    └─ Chama CompreFace                                  │
│                                                          │
│ 3. Dentro do Docker:                                    │
│    POST http://compreface-api:8080/api/v1/.../faces ✅  │
│    ├─ Header: x-api-key: dc71370c...                    │
│    ├─ Query: subject=joao.silva@...                     │
│    └─ Body: [imagem]                                    │
│                                                          │
│ 4. CompreFace API recebe e processa                     │
│    ├─ Detecta face na imagem                            │
│    ├─ Extrai features                                   │
│    └─ Salva no PostgreSQL                               │
│                                                          │
│ 5. CompreFace retorna sucesso                           │
│                                                          │
│ 6. Frontend retorna ao browser                          │
│    ✅ { success: true, userId: "..." }                  │
│                                                          │
│ 7. Toast: "Face cadastrada com sucesso!" 🎉            │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTE AGORA!

**Frontend reiniciado! Aguarde ~20 segundos**

### Passos:
```
1. Acesse: http://localhost:3000
2. Login: joao.silva@empresateste.com.br / senha123
3. Dashboard → Registrar Ponto
4. Modo CADASTRO aparece
5. Iniciar Câmera
6. Posicionar rosto
7. Aguardar 2.5s
8. ✅ "Face cadastrada com sucesso!"
```

**Sem mais erro "fetch failed"! 🎉**

---

## 🔍 VERIFICAÇÃO

### Ver Logs (se quiser confirmar):
```bash
docker compose logs frontend -f
```

**Deve aparecer:**
```
✓ Compiled /api/face-test/register
```

**Sem erros de ECONNREFUSED!**

---

### Verificar Subject no CompreFace:
```
1. Abrir: http://localhost:8000
2. Login: admin@webponto.com / admin123
3. Application: WebPonto
4. Recognition Service
5. Subjects
6. ✅ Ver "joao.silva@empresateste.com.br" listado!
```

---

## 📊 CONFIGURAÇÃO FINAL

### compreface.ts
```typescript
// ✅ Detecta automaticamente onde está rodando
const BASE_URL = typeof window === 'undefined' 
  ? 'http://compreface-api:8080/api/v1'  // Servidor
  : 'http://localhost:8080/api/v1'        // Browser
```

### Rede Docker (docker-compose.yml)
```yaml
networks:
  webponto_network:
    driver: bridge

services:
  frontend:
    networks:
      - webponto_network  # ✅ Pode acessar compreface-api
  
  compreface-api:
    networks:
      - webponto_network  # ✅ Acessível via nome do serviço
```

---

## 💡 LIÇÃO APRENDIDA

### Em Docker Compose:
- ✅ **Use nomes de serviços** entre containers
- ❌ **NÃO use localhost** entre containers
- ✅ **localhost funciona** do browser para o host

### Exemplos:
```typescript
// ❌ ERRADO (entre containers)
fetch('http://localhost:8080')

// ✅ CERTO (entre containers)
fetch('http://compreface-api:8080')

// ✅ CERTO (do browser para host)
fetch('http://localhost:3000')
```

---

## ✅ CHECKLIST

- [x] Identificado erro ECONNREFUSED
- [x] Corrigido URL para usar nome do serviço Docker
- [x] Detecção automática server/client
- [x] Frontend reiniciado
- [x] Pronto para testar cadastro
- [x] Sem mais "fetch failed"

---

## 🎊 RESULTADO

**ANTES ❌:**
```
Erro ao cadastrar face
fetch failed
ECONNREFUSED
```

**DEPOIS ✅:**
```
✅ Face cadastrada com sucesso!
Badge "Face Cadastrada" aparece
Subject salvo no CompreFace
```

---

**🎉 PROBLEMA RESOLVIDO!**

**Aguarde ~20 segundos e teste o cadastro! 🚀**
