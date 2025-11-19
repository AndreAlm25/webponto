# ✅ CHECKLIST COMPLETO - WEBPONTO

## 🎯 TESTES OBRIGATÓRIOS (antes de dizer que funciona!)

### 1️⃣ **AUTENTICAÇÃO**
```bash
# Teste 1: Login via API
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@empresateste.com.br","password":"senha123"}'

# ✅ Deve retornar: { "accessToken": "...", "user": {...} }
```

### 2️⃣ **CADASTRO FACIAL**
```bash
# Teste 2: Cadastrar face (funcionario ID 2)
curl -X POST http://localhost:4000/api/pontos/facial/cadastro \
  -F "funcionarioId=2" \
  -F "foto=@/caminho/para/foto.jpg"

# ✅ Deve retornar: { "message": "Face cadastrada com sucesso!", ... }
# ❌ NÃO DEVE retornar: "Funcionário não encontrado"
```

### 3️⃣ **RECONHECIMENTO FACIAL**
```bash
# Teste 3: Reconhecer face e registrar ponto
curl -X POST http://localhost:4000/api/pontos/facial \
  -F "foto=@/caminho/para/foto.jpg"

# ✅ Deve retornar: { "ponto": {...}, "funcionario": {...}, "tipo": "ENTRADA" }
# ❌ NÃO DEVE retornar: "Rosto não reconhecido"
```

### 4️⃣ **FRONTEND - LOGIN**
```
URL: http://localhost:3000/login
Email: joao.silva@empresateste.com.br
Senha: senha123

✅ Deve redirecionar para /dashboard
❌ NÃO DEVE dar erro 404
```

### 5️⃣ **FRONTEND - BOTÕES DE MODO**
```
URL: http://localhost:3000/ponto/facial

✅ Se NÃO TEM face cadastrada:
   - Mostra apenas modo CADASTRO
   - Esconde botão "Reconhecimento"
   
✅ Se JÁ TEM face cadastrada:
   - Mostra AMBOS os botões
   - Pode trocar entre Cadastro/Reconhecimento
   
✅ Se usuário é ADMIN:
   - Sempre mostra AMBOS os botões
```

### 6️⃣ **FLUXO COMPLETO**
```
1. Login → ✅ Sucesso
2. Dashboard → ✅ Carrega
3. "Registrar Ponto" → ✅ Vai para /ponto/facial
4. Iniciar Câmera → ✅ Câmera ativa
5. Posicionar rosto → ✅ Detecta rosto
6. Aguardar 2.5s → ✅ Captura automática
7. Cadastro → ✅ "Face cadastrada com sucesso!"
8. Voltar → ✅ Botões aparecem
9. Trocar para "Reconhecimento" → ✅ Botão clicável
10. Iniciar Câmera → ✅ Câmera ativa
11. Reconhecer → ✅ "Ponto registrado!"
```

---

## 🐛 BUGS CONHECIDOS (JÁ CORRIGIDOS)

### ❌ BUG #1: Login dá 404
**Causa:** Frontend chamava `/auth/login` sem `/api`  
**Correção:** Mudado para `/api/auth/login`  
**Arquivo:** `frontend/src/contexts/AuthContext.tsx` linha 130

### ❌ BUG #2: Cadastro dá "Funcionário não encontrado"
**Causa:** Backend procurava `empresaId: 1` mas no banco é `empresaId: 2`  
**Correção:** Mudado para `empresaId: 2`  
**Arquivo:** `backend/src/modules/pontos/pontos.controller.ts` linhas 42 e 90

### ❌ BUG #3: Scripts não funcionam
**Causa:** Scripts chamavam `docker-compose.dev.yml` que não existe  
**Correção:** Adicionado `cd "$(dirname "$0")/.."` e usar `docker-compose.yml`  
**Arquivos:** Todos em `/root/Apps/webponto/scripts/*.sh`

### ❌ BUG #4: Botões sumiram
**Causa:** Usuário achava que sumiram, mas só aparecem se tiver face ou ser admin  
**Correção:** Nenhuma, comportamento correto!  
**Lógica:** Linha 170 em `frontend/src/app/ponto/facial/page.tsx`

---

## 📊 ESTRUTURA DO BANCO (ATUAL vs IDEAL)

### **ATUAL (redundante):**
```
Empresa (ID: 2)
  ├─ Usuario (ID: 3, email: joao.silva@...)  → LOGIN
  │   └─ vinculado a ↓
  └─ Funcionario (ID: 2, matricula: FUNC001) → PONTO
```

### **IDEAL (simplificado):**
```
Empresa (ID: 2)
  └─ Funcionario (ID: 2)
      ├─ email: joao.silva@...
      ├─ senha: (hash)
      ├─ matricula: FUNC001
      ├─ faceId: func_2
      └─ role: FUNCIONARIO | ADMIN | SUPERVISOR
```

**Vantagem:** Uma única tabela, sem duplicação!

---

## 🛠️ COMO TESTAR TUDO

### 1. **Reiniciar todos os containers:**
```bash
cd /root/Apps/webponto
docker compose down
docker compose up -d
```

### 2. **Ver logs em tempo real:**
```bash
cd /root/Apps/webponto/scripts
./ver-logs.sh
```

### 3. **Testar API manualmente:**
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@empresateste.com.br","password":"senha123"}'

# Cadastro (precisa de foto real)
curl -X POST http://localhost:4000/api/pontos/facial/cadastro \
  -F "funcionarioId=2" \
  -F "foto=@foto.jpg"
```

### 4. **Testar no navegador:**
```
http://localhost:3000/login
```

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Câmera só funciona em LOCALHOST ou HTTPS**
   - ❌ `http://192.168.18.44:3000` → Câmera bloqueada
   - ✅ `http://localhost:3000` → Câmera funciona
   - ✅ `https://...` → Câmera funciona

2. **empresaId SEMPRE = 2**
   - Todos os funcionários pertencem à empresa ID 2
   - Código hardcoded usa empresaId = 2

3. **Funcionários existentes:**
   - ID 2: João Silva (FUNC001)
   - ID 3: Maria Santos (FUNC002)
   - ID 4: Pedro Oliveira (FUNC003)

4. **Mapeamento Usuario → Funcionario:**
   - Usuario ID 3 (joao.silva@...) → Funcionario ID 2
   - Usuario ID 4 (maria.santos@...) → Funcionario ID 3
   - Usuario ID 5 (pedro.oliveira@...) → Funcionario ID 4

---

## 🎯 PRIORIDADES

### **ALTA PRIORIDADE:**
- [x] Corrigir login 404
- [x] Corrigir empresaId (1 → 2)
- [x] Corrigir scripts
- [ ] Testar cadastro facial completo
- [ ] Testar reconhecimento completo

### **MÉDIA PRIORIDADE:**
- [ ] Simplificar estrutura do banco (remover tabela usuarios)
- [ ] Adicionar autenticação JWT aos endpoints
- [ ] Configurar HTTPS para acesso remoto

### **BAIXA PRIORIDADE:**
- [ ] Configurar Swagger
- [ ] Hot reload no backend
- [ ] Logs melhorados

---

**📅 Última atualização:** 20/10/2025 22:40  
**👤 Responsável:** Cascade AI  
**📊 Status geral:** 🟡 Em correção
