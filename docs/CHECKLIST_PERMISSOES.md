# ✅ CHECKLIST DE TESTES - PERMISSÕES

> **WebPonto - Controle de Qualidade**  
> **Data de início:** 07/12/2024  
> **Status:** 🔄 Em Execução

---

## 📋 RESUMO DAS FASES

| Fase | Descrição | Status | Progresso |
|------|-----------|--------|-----------|
| 1 | Corrigir Sidebar (menus) | ✅ Concluído | 3/3 |
| 2 | Auditar Páginas (ProtectedPage) | ✅ Implementado | 13/14 |
| 3 | Auditar Botões de Ação | 🔄 Em Progresso | 3/? |
| 4 | Testar por Role | ⏳ Pendente | 0/3 |

---

## 🔧 FASE 1: CORRIGIR SIDEBAR

### Objetivo
Garantir que os menus do sidebar só apareçam para quem tem permissão.

### Problemas Identificados

| # | Menu | Problema | Correção | Status |
|---|------|----------|----------|--------|
| 1.1 | Config. da Empresa | Aparece para todos, deveria verificar `settings.view` | Adicionado `hasAnyPermission([settings.view, permissions.view, audit.view])` | ✅ |
| 1.2 | Gestão de Colaboradores | Menu pai aparece sempre, deveria verificar se tem alguma permissão dos submenus | Adicionado `hasAnyPermission` com todas as permissões dos submenus | ✅ |
| 1.3 | Submenus de Config | Dashboard, Folha, Conformidade, Aplicativo não verificam permissão | Adicionado `hasPermission(PERMISSIONS.SETTINGS_VIEW)` em cada submenu | ✅ |

### Testes Após Correção

| Role | Config. da Empresa | Gestão de Colaboradores | Análises |
|------|-------------------|------------------------|----------|
| MANAGER | ❌ Não deve ver | ✅ Deve ver (parcial) | ✅ Deve ver |
| HR | ❌ Não deve ver | ✅ Deve ver (parcial) | ✅ Deve ver |
| FINANCIAL | ❌ Não deve ver | ✅ Deve ver (só Folha e Vales) | ❌ Não deve ver |

---

## 📄 FASE 2: AUDITAR PÁGINAS

### Objetivo
Garantir que cada página use `ProtectedPage` com a permissão correta.

### Lista de Páginas

| # | Rota | Permissão | Usa ProtectedPage? | Status |
|---|------|-----------|-------------------|--------|
| 2.1 | `/admin/[company]` | `dashboard.view` | ✅ SIM | ✅ |
| 2.2 | `/admin/[company]/funcionarios` | `employees.view` | ✅ SIM | ✅ |
| 2.3 | `/admin/[company]/cargos` | `positions.view` | ❓ Página não existe | ⏳ |
| 2.4 | `/admin/[company]/departamentos` | `departments.view` | ❓ Página não existe | ⏳ |
| 2.5 | `/admin/[company]/folha-pagamento` | `payroll.view` | ✅ SIM | ✅ |
| 2.6 | `/admin/[company]/vales` | `advances.view` | ✅ SIM | ✅ |
| 2.7 | `/admin/[company]/terminal-de-ponto` | `terminal.view` | ⚠️ Especial (múltiplos returns) | ⏳ |
| 2.8 | `/admin/[company]/cercas-geograficas` | `geofences.view` | ✅ SIM | ✅ |
| 2.9 | `/admin/[company]/analises/registros` | `time_entries.view` | ✅ SIM | ✅ |
| 2.10 | `/admin/[company]/analises/hora-extra` | `overtime.view` | ✅ SIM | ✅ |
| 2.11 | `/admin/[company]/analises/conformidade-clt` | `compliance.view` | ✅ SIM | ✅ |
| 2.12 | `/admin/[company]/alertas` | `alerts.view` | ✅ SIM | ✅ |
| 2.13 | `/admin/[company]/configuracoes/*` | `settings.view` | ✅ SIM (4 páginas) | ✅ |
| 2.14 | `/admin/[company]/auditoria` | `audit.view` | ✅ SIM | ✅ |
| 2.15 | `/admin/[company]/configuracoes/permissoes` | `permissions.view` | ✅ SIM | ✅ |

---

## 🔘 FASE 3: AUDITAR BOTÕES DE AÇÃO

### Objetivo
Garantir que botões de criar/editar/excluir só apareçam com permissão.

### Funcionários (`/admin/[company]/funcionarios`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Novo Funcionário | `employees.create` | ✅ SIM | ✅ |
| Editar Funcionário | `employees.edit` | ✅ SIM | ✅ |
| Excluir Funcionário | `employees.delete` | ✅ SIM | ✅ |
| Gerenciar Face | `employees.manage_face` | ✅ SIM | ✅ |
| Exportar | `employees.export` | ✅ SIM | ✅ |

### Cargos (`/admin/[company]/cargos`)

> Página não existe separadamente (gerenciado em funcionários)

### Departamentos (`/admin/[company]/departamentos`)

> Página não existe separadamente (gerenciado em funcionários)

### Folha de Pagamento (`/admin/[company]/folha-pagamento`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Gerar Folha | `payroll.generate` | ✅ SIM | ✅ |
| Aprovar Folha | `payroll.approve` | ✅ SIM | ✅ |
| Marcar como Paga | `payroll.pay` | ✅ SIM | ✅ |
| Configurações | `settings.edit` | ✅ SIM | ✅ |

### Vales (`/admin/[company]/vales`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Novo Vale | `advances.create` | ✅ SIM | ✅ |
| Aprovar Vale | `advances.approve` | ✅ SIM | ✅ |
| Rejeitar Vale | `advances.reject` | ✅ SIM | ✅ |
| Marcar como Pago | `advances.pay` | ✅ SIM | ✅ |
| Cancelar Vale | `advances.delete` | ✅ SIM | ✅ |

### Hora Extra (`/admin/[company]/analises/hora-extra`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Aprovar | `overtime.approve` | ✅ SIM | ✅ |
| Rejeitar | `overtime.reject` | ✅ SIM | ✅ |

### Cercas Geográficas (`/admin/[company]/cercas-geograficas`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Nova Cerca | `geofences.create` | ✅ SIM | ✅ |
| Editar Cerca | `geofences.edit` | ✅ SIM | ✅ |
| Excluir Cerca | `geofences.delete` | ✅ SIM | ✅ |

### Mensagens (`/admin/[company]/mensagens`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Nova Mensagem | `messages.create` | ✅ SIM | ✅ |

### Conformidade CLT (`/admin/[company]/analises/conformidade-clt`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Exportar PDF | `compliance.export` | ✅ SIM | ✅ |
| Exportar Excel | `compliance.export` | ✅ SIM | ✅ |

### Registros de Ponto (`/admin/[company]/analises/registros`)

> Página apenas de visualização, sem botões de ação

### Permissões (`/admin/[company]/configuracoes/permissoes`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Salvar | `permissions.edit` | ✅ SIM | ✅ |

---

## ✅ FASE 3 CONCLUÍDA

Todos os botões de ação nas páginas principais foram protegidos com o componente `<Can>`.

### Páginas auditadas:
- ✅ Funcionários (criar, editar, excluir, gerenciar face)
- ✅ Folha de Pagamento (gerar, aprovar, pagar)
- ✅ Vales (criar, aprovar, rejeitar, pagar, cancelar)
- ✅ Hora Extra (aprovar, rejeitar)
- ✅ Cercas Geográficas (criar, editar, excluir)
- ✅ Mensagens (criar)
- ✅ Conformidade CLT (exportar)
- ✅ Permissões (salvar)

---

## 👤 FASE 4: TESTAR POR ROLE

### Permissões Padrão por Role (seed-permissions.ts)

**MANAGER:**
- dashboard.view, employees.view, time_entries.view/create/export
- overtime.view/approve/reject, departments.view, positions.view
- geofences.view, messages.view/create, alerts.view, compliance.view
- terminal.view/clock_in

**HR:**
- dashboard.view, employees.view/create/edit/export/manage_face
- time_entries.view/create/edit/export, overtime.view/approve/reject/export
- payroll.view/export, advances.view/create
- departments.view/create/edit, positions.view/create/edit
- geofences.view, messages.view/create, alerts.view
- compliance.view/export, terminal.view/clock_in

**FINANCIAL:**
- dashboard.view
- payroll.view/create/edit/approve/pay/generate/export
- advances.view/approve/reject/delete

---

### MANAGER

| Funcionalidade | Permissão | Esperado | Status |
|----------------|-----------|----------|--------|
| Ver Dashboard | dashboard.view | ✅ Acesso | ⏳ |
| Ver Funcionários | employees.view | ✅ Acesso | ⏳ |
| Criar Funcionário | employees.create | ❌ Oculto | ⏳ |
| Editar Funcionário | employees.edit | ❌ Oculto | ⏳ |
| Ver Registros | time_entries.view | ✅ Acesso | ⏳ |
| Criar Registro | time_entries.create | ✅ Visível | ⏳ |
| Ver Hora Extra | overtime.view | ✅ Acesso | ⏳ |
| Aprovar Hora Extra | overtime.approve | ✅ Visível | ⏳ |
| Ver Folha | payroll.view | ❌ Oculto | ⏳ |
| Ver Vales | advances.view | ❌ Oculto | ⏳ |
| Ver Cercas | geofences.view | ✅ Acesso | ⏳ |
| Criar Cerca | geofences.create | ❌ Oculto | ⏳ |
| Ver Mensagens | messages.view | ✅ Acesso | ⏳ |
| Ver Conformidade | compliance.view | ✅ Acesso | ⏳ |
| Ver Configurações | settings.view | ❌ Oculto | ⏳ |
| Ver Permissões | permissions.view | ❌ Oculto | ⏳ |

### HR

| Funcionalidade | Permissão | Esperado | Status |
|----------------|-----------|----------|--------|
| Ver Dashboard | dashboard.view | ✅ Acesso | ⏳ |
| Ver Funcionários | employees.view | ✅ Acesso | ⏳ |
| Criar Funcionário | employees.create | ✅ Visível | ⏳ |
| Editar Funcionário | employees.edit | ✅ Visível | ⏳ |
| Excluir Funcionário | employees.delete | ❌ Oculto | ⏳ |
| Gerenciar Face | employees.manage_face | ✅ Visível | ⏳ |
| Ver Registros | time_entries.view | ✅ Acesso | ⏳ |
| Editar Registro | time_entries.edit | ✅ Visível | ⏳ |
| Ver Hora Extra | overtime.view | ✅ Acesso | ⏳ |
| Aprovar Hora Extra | overtime.approve | ✅ Visível | ⏳ |
| Ver Folha | payroll.view | ✅ Acesso | ⏳ |
| Gerar Folha | payroll.generate | ❌ Oculto | ⏳ |
| Ver Vales | advances.view | ✅ Acesso | ⏳ |
| Criar Vale | advances.create | ✅ Visível | ⏳ |
| Aprovar Vale | advances.approve | ❌ Oculto | ⏳ |
| Ver Cercas | geofences.view | ✅ Acesso | ⏳ |
| Criar Cerca | geofences.create | ❌ Oculto | ⏳ |
| Ver Conformidade | compliance.view | ✅ Acesso | ⏳ |
| Exportar Conformidade | compliance.export | ✅ Visível | ⏳ |
| Ver Configurações | settings.view | ❌ Oculto | ⏳ |
| Ver Permissões | permissions.view | ❌ Oculto | ⏳ |

### FINANCIAL

| Funcionalidade | Permissão | Esperado | Status |
|----------------|-----------|----------|--------|
| Ver Dashboard | dashboard.view | ✅ Acesso | ⏳ |
| Ver Funcionários | employees.view | ❌ Oculto | ⏳ |
| Ver Registros | time_entries.view | ❌ Oculto | ⏳ |
| Ver Hora Extra | overtime.view | ❌ Oculto | ⏳ |
| Ver Folha | payroll.view | ✅ Acesso | ⏳ |
| Gerar Folha | payroll.generate | ✅ Visível | ⏳ |
| Aprovar Folha | payroll.approve | ✅ Visível | ⏳ |
| Pagar Folha | payroll.pay | ✅ Visível | ⏳ |
| Ver Vales | advances.view | ✅ Acesso | ⏳ |
| Aprovar Vale | advances.approve | ✅ Visível | ⏳ |
| Rejeitar Vale | advances.reject | ✅ Visível | ⏳ |
| Cancelar Vale | advances.delete | ✅ Visível | ⏳ |
| Ver Cercas | geofences.view | ❌ Oculto | ⏳ |
| Ver Mensagens | messages.view | ❌ Oculto | ⏳ |
| Ver Conformidade | compliance.view | ❌ Oculto | ⏳ |
| Ver Configurações | settings.view | ❌ Oculto | ⏳ |
| Ver Permissões | permissions.view | ❌ Oculto | ⏳ |

---

## 📊 RESUMO FINAL

> Preencher após conclusão de todas as fases

| Métrica | Valor |
|---------|-------|
| Total de itens testados | - |
| Itens aprovados | - |
| Itens reprovados | - |
| Taxa de sucesso | - |

### Problemas Encontrados

| # | Descrição | Severidade | Corrigido? |
|---|-----------|------------|------------|
| - | - | - | - |

### Conclusão

> Preencher após todos os testes

---

## 📝 HISTÓRICO DE ALTERAÇÕES

| Data | Fase | Alteração | Responsável |
|------|------|-----------|-------------|
| 07/12/2024 | - | Documento criado | Sistema |

