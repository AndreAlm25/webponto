# 🔄 REFATORAÇÃO: Funções em Português para Inglês

**Data:** 24/11/2025  
**Status:** Pendente  
**Prioridade:** Baixa (não urgente, mas manter consistência)

---

## 📋 **PADRÃO DO PROJETO**

### Backend (NestJS):
- ✅ **Código:** TODO em inglês (funções, variáveis, classes, métodos)
- ✅ **Comentários:** Em português (para facilitar entendimento)
- ✅ **Rotas:** Em inglês (padrão REST API)

### Frontend (Next.js/React):
- ✅ **Código:** TODO em inglês (componentes, funções, variáveis, hooks)
- ✅ **Comentários:** Em português
- ✅ **Rotas/URLs:** Em português (para usuários brasileiros)

---

## ✅ **FUNÇÕES JÁ RENOMEADAS**

| Arquivo | Função Antiga | Função Nova | Status |
|---------|---------------|-------------|--------|
| `time-entries.service.ts` | `detectarHoraExtra()` | `detectOvertimeAndViolations()` | ✅ Concluído |

---

## ⏳ **FUNÇÕES PENDENTES DE RENOMEAÇÃO**

### 1️⃣ **time-entries.service.ts**

| Função Atual | Sugestão em Inglês | Linha | Tipo |
|--------------|-------------------|-------|------|
| `listarPontos()` | `listTimeEntries()` | ~814 | public |
| `obterStatus()` | `getEmployeeStatus()` | ~680 | public |

**Impacto:** ⚠️ **ALTO** - Funções públicas usadas pelo controller e frontend

---

### 2️⃣ **time-entries.controller.ts**

| Função Atual | Sugestão em Inglês | Linha | Rota Afetada |
|--------------|-------------------|-------|--------------|
| `listarPontos()` | `listTimeEntries()` | ~170 | `GET /:employeeId` |
| `obterStatus()` | `getStatus()` | ~133 | `GET /facial/status/:employeeId` |

**Impacto:** ⚠️ **ALTO** - Endpoints usados pelo frontend

---

### 3️⃣ **overtime.service.ts**

| Função Atual | Sugestão em Inglês | Linha | Tipo |
|--------------|-------------------|-------|------|
| `listarHorasExtras()` | `listOvertimeEntries()` | ~15 | public |
| `aprovarHoraExtra()` | `approveOvertime()` | ~94 | public |
| `rejeitarHoraExtra()` | `rejectOvertime()` | ~144 | public |
| `aprovarEmLote()` | `approveBatch()` | ~194 | public |
| `rejeitarEmLote()` | `rejectBatch()` | ~212 | public |

**Impacto:** ⚠️ **ALTO** - Funções públicas usadas pelo controller

---

### 4️⃣ **overtime.controller.ts**

| Função Atual | Sugestão em Inglês | Linha | Rota Afetada |
|--------------|-------------------|-------|--------------|
| `listar()` | `list()` | ~16 | `GET /api/overtime` |
| `aprovar()` | `approve()` | ~45 | `PATCH /api/overtime/:id/approve` |
| `rejeitar()` | `reject()` | ~58 | `PATCH /api/overtime/:id/reject` |
| `aprovarLote()` | `approveBatch()` | ~71 | `POST /api/overtime/approve-batch` |
| `rejeitarLote()` | `rejectBatch()` | ~80 | `POST /api/overtime/reject-batch` |

**Impacto:** ⚠️ **ALTO** - Endpoints usados pelo frontend

---

## 🎯 **PLANO DE REFATORAÇÃO**

### Fase 1: Preparação
- [ ] Identificar todos os pontos de uso no frontend
- [ ] Criar testes para garantir que nada quebre
- [ ] Documentar rotas afetadas

### Fase 2: Backend (Service Layer)
- [ ] Renomear funções em `time-entries.service.ts`
- [ ] Renomear funções em `overtime.service.ts`
- [ ] Atualizar imports e chamadas internas

### Fase 3: Backend (Controller Layer)
- [ ] Renomear funções em `time-entries.controller.ts`
- [ ] Renomear funções em `overtime.controller.ts`
- [ ] Verificar se rotas HTTP continuam funcionando

### Fase 4: Frontend
- [ ] Atualizar chamadas de API no frontend
- [ ] Testar todas as páginas afetadas:
  - `/admin/[company]/funcionarios` (lista pontos)
  - `/admin/[company]/overtime` (lista/aprova horas extras)
  - Terminal de ponto (obter status)

### Fase 5: Validação
- [ ] Testar fluxo completo de ponto
- [ ] Testar fluxo completo de hora extra
- [ ] Verificar logs do backend
- [ ] Validar em ambiente de produção

---

## ⚠️ **OBSERVAÇÕES IMPORTANTES**

1. **NÃO URGENTE:** Sistema está funcionando, refatoração é apenas para consistência
2. **FAZER COM CALMA:** Testar bem cada mudança para não quebrar produção
3. **PRIORIDADE BAIXA:** Focar primeiro em features novas, depois refatorar
4. **DOCUMENTAR:** Manter este arquivo atualizado conforme for refatorando

---

## 📝 **CHECKLIST DE SEGURANÇA**

Antes de fazer qualquer refatoração:

- [ ] Fazer backup do banco de dados
- [ ] Criar branch separada no Git
- [ ] Rodar todos os testes
- [ ] Testar em ambiente de desenvolvimento primeiro
- [ ] Fazer deploy gradual (canary deployment se possível)
- [ ] Monitorar logs após deploy

---

**Última atualização:** 24/11/2025  
**Responsável:** Equipe de desenvolvimento
