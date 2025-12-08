# 🧪 ESTRATÉGIA DE TESTES - SISTEMA DE PERMISSÕES

> **Documento de Testes** - WebPonto  
> **Data:** 05/12/2024  
> **Status:** Em Execução

---

## 📋 PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS (Bloqueia uso)

| # | Problema | Status | Prioridade |
|---|----------|--------|------------|
| 1 | Modal de escolha (Admin/Pessoal) não aparece para MANAGER/HR/FINANCIAL | ✅ Corrigido | ALTA |
| 2 | Toast de "sem permissão" aparece 3x ao acessar rota bloqueada | ✅ Corrigido | MÉDIA |
| 3 | Permissões do painel admin não refletem no frontend | 🔍 Em análise | ALTA |

### 🟡 MÉDIOS (Funciona parcialmente)

| # | Problema | Status | Prioridade |
|---|----------|--------|------------|
| 4 | Menus do sidebar aparecem mesmo sem permissão | ❌ Pendente | MÉDIA |
| 5 | Botões de ação aparecem mesmo sem permissão | ❌ Pendente | MÉDIA |
| 6 | WebSocket não atualiza permissões em tempo real | ❌ Pendente | BAIXA |

---

## 🎯 MATRIZ DE TESTES POR ROLE

### Legenda
- ✅ Deve ter acesso
- ❌ NÃO deve ter acesso
- 🔍 Testar

### SUPER_ADMIN / COMPANY_ADMIN
> Acesso total - não precisa testar restrições

### MANAGER (Gerente)

| Funcionalidade | Permissão | Esperado | Testado |
|----------------|-----------|----------|---------|
| **LOGIN** |
| Escolher painel (Admin/Pessoal) | - | Modal aparece | 🔍 |
| **DASHBOARD** |
| Ver dashboard | dashboard.view | ✅ | 🔍 |
| **FUNCIONÁRIOS** |
| Ver lista | employees.view | ✅ | 🔍 |
| Criar funcionário | employees.create | ❌ | 🔍 |
| Editar funcionário | employees.edit | ❌ | 🔍 |
| Excluir funcionário | employees.delete | ❌ | 🔍 |
| **REGISTROS DE PONTO** |
| Ver registros | time_entries.view | ✅ | 🔍 |
| Criar registro manual | time_entries.create | ✅ | 🔍 |
| Editar registro | time_entries.edit | ❌ | 🔍 |
| Excluir registro | time_entries.delete | ❌ | 🔍 |
| **HORA EXTRA** |
| Ver hora extra | overtime.view | ✅ | 🔍 |
| Aprovar hora extra | overtime.approve | ✅ | 🔍 |
| Rejeitar hora extra | overtime.reject | ✅ | 🔍 |
| **FOLHA DE PAGAMENTO** |
| Ver folha | payroll.view | ❌ | 🔍 |
| **VALES** |
| Ver vales | advances.view | ❌ | 🔍 |
| **DEPARTAMENTOS** |
| Ver departamentos | departments.view | ✅ | 🔍 |
| Criar departamento | departments.create | ❌ | 🔍 |
| **CARGOS** |
| Ver cargos | positions.view | ✅ | 🔍 |
| Criar cargo | positions.create | ❌ | 🔍 |
| **CERCAS GEOGRÁFICAS** |
| Ver cercas | geofences.view | ✅ | 🔍 |
| Criar cerca | geofences.create | ❌ | 🔍 |
| **TERMINAL DE PONTO** |
| Ver terminal | terminal.view | ✅ | 🔍 |
| **ALERTAS** |
| Ver alertas | alerts.view | ✅ | 🔍 |
| **CONFIGURAÇÕES** |
| Ver configurações | settings.view | ❌ | 🔍 |
| **AUDITORIA** |
| Ver auditoria | audit.view | ❌ | 🔍 |

### HR (Recursos Humanos)

| Funcionalidade | Permissão | Esperado | Testado |
|----------------|-----------|----------|---------|
| **LOGIN** |
| Escolher painel (Admin/Pessoal) | - | Modal aparece | 🔍 |
| **DASHBOARD** |
| Ver dashboard | dashboard.view | ✅ | 🔍 |
| **FUNCIONÁRIOS** |
| Ver lista | employees.view | ✅ | 🔍 |
| Criar funcionário | employees.create | ✅ | 🔍 |
| Editar funcionário | employees.edit | ✅ | 🔍 |
| Excluir funcionário | employees.delete | ❌ | 🔍 |
| Gerenciar face | employees.manage_face | ✅ | 🔍 |
| **REGISTROS DE PONTO** |
| Ver registros | time_entries.view | ✅ | 🔍 |
| Criar registro manual | time_entries.create | ✅ | 🔍 |
| Editar registro | time_entries.edit | ✅ | 🔍 |
| Excluir registro | time_entries.delete | ❌ | 🔍 |
| **HORA EXTRA** |
| Ver hora extra | overtime.view | ✅ | 🔍 |
| Aprovar hora extra | overtime.approve | ✅ | 🔍 |
| **FOLHA DE PAGAMENTO** |
| Ver folha | payroll.view | ✅ | 🔍 |
| Gerar folha | payroll.generate | ❌ | 🔍 |
| **VALES** |
| Ver vales | advances.view | ✅ | 🔍 |
| Criar vale | advances.create | ✅ | 🔍 |
| Aprovar vale | advances.approve | ❌ | 🔍 |
| **DEPARTAMENTOS** |
| Ver departamentos | departments.view | ✅ | 🔍 |
| Criar departamento | departments.create | ✅ | 🔍 |
| Editar departamento | departments.edit | ✅ | 🔍 |
| **CARGOS** |
| Ver cargos | positions.view | ✅ | 🔍 |
| Criar cargo | positions.create | ✅ | 🔍 |
| Editar cargo | positions.edit | ✅ | 🔍 |
| **CERCAS GEOGRÁFICAS** |
| Ver cercas | geofences.view | ✅ | 🔍 |
| Criar cerca | geofences.create | ❌ | 🔍 |
| **ALERTAS** |
| Ver alertas | alerts.view | ✅ | 🔍 |
| **CONFIGURAÇÕES** |
| Ver configurações | settings.view | ❌ | 🔍 |

### FINANCIAL (Financeiro)

| Funcionalidade | Permissão | Esperado | Testado |
|----------------|-----------|----------|---------|
| **LOGIN** |
| Escolher painel (Admin/Pessoal) | - | Modal aparece | 🔍 |
| **DASHBOARD** |
| Ver dashboard | dashboard.view | ❌ | 🔍 |
| **FUNCIONÁRIOS** |
| Ver lista | employees.view | ❌ | 🔍 |
| **REGISTROS DE PONTO** |
| Ver registros | time_entries.view | ❌ | 🔍 |
| **HORA EXTRA** |
| Ver hora extra | overtime.view | ❌ | 🔍 |
| **FOLHA DE PAGAMENTO** |
| Ver folha | payroll.view | ✅ | 🔍 |
| Criar folha | payroll.create | ✅ | 🔍 |
| Editar folha | payroll.edit | ✅ | 🔍 |
| Aprovar folha | payroll.approve | ✅ | 🔍 |
| Pagar folha | payroll.pay | ✅ | 🔍 |
| Gerar folha | payroll.generate | ✅ | 🔍 |
| **VALES** |
| Ver vales | advances.view | ✅ | 🔍 |
| Aprovar vale | advances.approve | ✅ | 🔍 |
| Rejeitar vale | advances.reject | ✅ | 🔍 |
| **DEPARTAMENTOS** |
| Ver departamentos | departments.view | ❌ | 🔍 |
| **CARGOS** |
| Ver cargos | positions.view | ❌ | 🔍 |
| **CERCAS GEOGRÁFICAS** |
| Ver cercas | geofences.view | ❌ | 🔍 |
| **CONFIGURAÇÕES** |
| Ver configurações | settings.view | ❌ | 🔍 |

### EMPLOYEE (Funcionário)

| Funcionalidade | Permissão | Esperado | Testado |
|----------------|-----------|----------|---------|
| **LOGIN** |
| Redireciona para painel pessoal | - | Direto para /{empresa}/{slug} | 🔍 |
| **PAINEL PESSOAL** |
| Ver próprios dados | - | ✅ | 🔍 |
| Bater ponto | time_entries.create (próprio) | ✅ | 🔍 |
| Ver próprios registros | time_entries.view (próprio) | ✅ | 🔍 |
| Ver próprio holerite | payroll.view (próprio) | ✅ | 🔍 |
| Ver próprias mensagens | messages.view (próprio) | ✅ | 🔍 |
| **PAINEL ADMIN** |
| Acessar /admin/* | - | ❌ BLOQUEADO | 🔍 |

---

## 🔧 CORREÇÕES NECESSÁRIAS

### 1. Modal de Escolha no Login

**Arquivo:** `/frontend/src/app/login/page.tsx`

**Problema:** Linhas 46-48 redirecionam MANAGER/HR/FINANCIAL direto para admin

**Solução:** Mostrar modal para escolher entre:
- 🏢 Painel Admin
- 👤 Meu Painel

### 2. Toast Triplo

**Arquivo:** `/frontend/src/components/auth/ProtectedPage.tsx`

**Problema:** Toast sendo chamado múltiplas vezes

**Solução:** Usar flag para evitar múltiplas chamadas

### 3. Sincronização de Permissões

**Arquivos:**
- `/frontend/src/contexts/PermissionContext.tsx`
- `/frontend/src/components/admin/AdminSidebar.tsx`
- Todas as páginas admin

**Problema:** Frontend não está verificando permissões corretamente

**Solução:** 
1. Verificar se `hasPermission()` está sendo chamado
2. Verificar se permissões estão sendo carregadas do backend
3. Adicionar logs para debug

---

## 📝 CHECKLIST DE EXECUÇÃO

### Fase 1: Correções Críticas
- [ ] Implementar modal de escolha no login
- [ ] Corrigir toast triplo
- [ ] Verificar carregamento de permissões

### Fase 2: Auditoria de UI
- [ ] Verificar todos os menus do sidebar
- [ ] Verificar todos os botões de ação
- [ ] Verificar todas as rotas protegidas

### Fase 3: Testes por Role
- [ ] Testar MANAGER
- [ ] Testar HR
- [ ] Testar FINANCIAL
- [ ] Testar EMPLOYEE

### Fase 4: Validação Final
- [ ] Testar WebSocket de permissões
- [ ] Testar alteração de permissões em tempo real
- [ ] Documentar resultados

---

## 🚀 COMO EXECUTAR OS TESTES

### Usuários de Teste (verificar no banco)

```sql
-- Listar usuários por role
SELECT u.email, u.role, c.trade_name as empresa
FROM "User" u
JOIN "Company" c ON u.company_id = c.id
ORDER BY u.role;
```

### Passos para cada teste:

1. **Fazer logout** (limpar localStorage)
2. **Fazer login** com usuário do role específico
3. **Verificar redirecionamento** (modal ou direto)
4. **Testar cada funcionalidade** da matriz
5. **Anotar resultado** (✅ passou / ❌ falhou)
6. **Se falhou:** anotar comportamento observado

---

## 📊 RESULTADOS DOS TESTES

> Preencher conforme testes forem executados

### MANAGER
| Data | Testador | Resultado | Observações |
|------|----------|-----------|-------------|
| - | - | - | - |

### HR
| Data | Testador | Resultado | Observações |
|------|----------|-----------|-------------|
| - | - | - | - |

### FINANCIAL
| Data | Testador | Resultado | Observações |
|------|----------|-----------|-------------|
| - | - | - | - |

### EMPLOYEE
| Data | Testador | Resultado | Observações |
|------|----------|-----------|-------------|
| - | - | - | - |
