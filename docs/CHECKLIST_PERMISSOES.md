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
| 3 | Auditar Botões de Ação | ⏳ Pendente | 0/? |
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
| Novo Funcionário | `employees.create` | 🔍 Verificar | ⏳ |
| Editar Funcionário | `employees.edit` | 🔍 Verificar | ⏳ |
| Excluir Funcionário | `employees.delete` | 🔍 Verificar | ⏳ |
| Gerenciar Face | `employees.manage_face` | 🔍 Verificar | ⏳ |
| Exportar | `employees.export` | 🔍 Verificar | ⏳ |

### Cargos (`/admin/[company]/cargos`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Novo Cargo | `positions.create` | 🔍 Verificar | ⏳ |
| Editar Cargo | `positions.edit` | 🔍 Verificar | ⏳ |
| Excluir Cargo | `positions.delete` | 🔍 Verificar | ⏳ |

### Departamentos (`/admin/[company]/departamentos`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Novo Departamento | `departments.create` | 🔍 Verificar | ⏳ |
| Editar Departamento | `departments.edit` | 🔍 Verificar | ⏳ |
| Excluir Departamento | `departments.delete` | 🔍 Verificar | ⏳ |

### Folha de Pagamento (`/admin/[company]/folha-pagamento`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Gerar Folha | `payroll.generate` | 🔍 Verificar | ⏳ |
| Aprovar Folha | `payroll.approve` | 🔍 Verificar | ⏳ |
| Marcar como Paga | `payroll.pay` | 🔍 Verificar | ⏳ |
| Exportar | `payroll.export` | 🔍 Verificar | ⏳ |

### Vales (`/admin/[company]/vales`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Novo Vale | `advances.create` | 🔍 Verificar | ⏳ |
| Aprovar Vale | `advances.approve` | 🔍 Verificar | ⏳ |
| Rejeitar Vale | `advances.reject` | 🔍 Verificar | ⏳ |
| Cancelar Vale | `advances.delete` | 🔍 Verificar | ⏳ |

### Hora Extra (`/admin/[company]/analises/hora-extra`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Aprovar | `overtime.approve` | 🔍 Verificar | ⏳ |
| Rejeitar | `overtime.reject` | 🔍 Verificar | ⏳ |
| Exportar | `overtime.export` | 🔍 Verificar | ⏳ |

### Registros de Ponto (`/admin/[company]/analises/registros`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Novo Registro | `time_entries.create` | 🔍 Verificar | ⏳ |
| Editar Registro | `time_entries.edit` | 🔍 Verificar | ⏳ |
| Excluir Registro | `time_entries.delete` | 🔍 Verificar | ⏳ |
| Exportar | `time_entries.export` | 🔍 Verificar | ⏳ |

### Cercas Geográficas (`/admin/[company]/cercas-geograficas`)

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Nova Cerca | `geofences.create` | 🔍 Verificar | ⏳ |
| Editar Cerca | `geofences.edit` | 🔍 Verificar | ⏳ |
| Excluir Cerca | `geofences.delete` | 🔍 Verificar | ⏳ |

### Configurações

| Botão | Permissão | Implementado? | Status |
|-------|-----------|---------------|--------|
| Salvar Config | `settings.edit` | 🔍 Verificar | ⏳ |
| Editar Permissões | `permissions.edit` | 🔍 Verificar | ⏳ |

---

## 👤 FASE 4: TESTAR POR ROLE

### MANAGER

| Funcionalidade | Esperado | Resultado | Status |
|----------------|----------|-----------|--------|
| Ver Dashboard | ✅ Acesso | 🔍 | ⏳ |
| Ver Funcionários | ✅ Acesso | 🔍 | ⏳ |
| Criar Funcionário | ❌ Botão oculto | 🔍 | ⏳ |
| Editar Funcionário | ❌ Botão oculto | 🔍 | ⏳ |
| Ver Registros | ✅ Acesso | 🔍 | ⏳ |
| Criar Registro | ✅ Botão visível | 🔍 | ⏳ |
| Ver Hora Extra | ✅ Acesso | 🔍 | ⏳ |
| Aprovar Hora Extra | ✅ Botão visível | 🔍 | ⏳ |
| Ver Folha | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Vales | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Configurações | ❌ Menu oculto | 🔍 | ⏳ |

### HR

| Funcionalidade | Esperado | Resultado | Status |
|----------------|----------|-----------|--------|
| Ver Dashboard | ✅ Acesso | 🔍 | ⏳ |
| Ver Funcionários | ✅ Acesso | 🔍 | ⏳ |
| Criar Funcionário | ✅ Botão visível | 🔍 | ⏳ |
| Editar Funcionário | ✅ Botão visível | 🔍 | ⏳ |
| Excluir Funcionário | ❌ Botão oculto | 🔍 | ⏳ |
| Ver Registros | ✅ Acesso | 🔍 | ⏳ |
| Editar Registro | ✅ Botão visível | 🔍 | ⏳ |
| Ver Folha | ✅ Acesso | 🔍 | ⏳ |
| Gerar Folha | ❌ Botão oculto | 🔍 | ⏳ |
| Ver Vales | ✅ Acesso | 🔍 | ⏳ |
| Aprovar Vale | ❌ Botão oculto | 🔍 | ⏳ |
| Ver Configurações | ❌ Menu oculto | 🔍 | ⏳ |

### FINANCIAL

| Funcionalidade | Esperado | Resultado | Status |
|----------------|----------|-----------|--------|
| Ver Dashboard | ✅ Acesso | 🔍 | ⏳ |
| Ver Funcionários | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Registros | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Hora Extra | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Folha | ✅ Acesso | 🔍 | ⏳ |
| Gerar Folha | ✅ Botão visível | 🔍 | ⏳ |
| Aprovar Folha | ✅ Botão visível | 🔍 | ⏳ |
| Ver Vales | ✅ Acesso | 🔍 | ⏳ |
| Aprovar Vale | ✅ Botão visível | 🔍 | ⏳ |
| Ver Configurações | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Cargos | ❌ Menu oculto | 🔍 | ⏳ |
| Ver Departamentos | ❌ Menu oculto | 🔍 | ⏳ |

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

