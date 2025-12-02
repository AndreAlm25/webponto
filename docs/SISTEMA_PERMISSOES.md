# 🔐 SISTEMA DE PERMISSÕES - PROPOSTA DE IMPLEMENTAÇÃO

> **Documento de Estratégia** - WebPonto  
> **Data:** 02/12/2024  
> **Status:** Aguardando Aprovação

---

## 📋 ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Análise do Sistema Atual](#2-análise-do-sistema-atual)
3. [Arquitetura Proposta](#3-arquitetura-proposta)
4. [Mapeamento Completo de Permissões](#4-mapeamento-completo-de-permissões)
5. [Estrutura do Banco de Dados](#5-estrutura-do-banco-de-dados)
6. [Fluxo de Funcionamento](#6-fluxo-de-funcionamento)
7. [Interface de Configuração](#7-interface-de-configuração)
8. [Impacto no Sistema](#8-impacto-no-sistema)
9. [Plano de Implementação](#9-plano-de-implementação)
10. [Perguntas para Aprovação](#10-perguntas-para-aprovação)

---

## 1. RESUMO EXECUTIVO

### 🎯 Objetivo
Implementar um sistema de permissões **RBAC + ACL** (Role-Based Access Control + Access Control List) que seja:
- **Configurável** pelo painel do admin (não fixo no código)
- **Flexível** para permitir ajustes granulares por módulo
- **Auditável** com logs de todas as ações
- **Seguro** com controle de acesso em múltiplas camadas

### 📌 Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **SUPER_ADMIN** | Sempre tem TODAS as permissões (fixo, não configurável) |
| **COMPANY_ADMIN** | Sempre tem TODAS as permissões da empresa (fixo, não configurável) |
| **Outros Roles** | Permissões configuráveis pelo admin no painel |
| **EMPLOYEE** | Acesso apenas ao painel do funcionário (próprios dados) |
| **Auditoria** | Toda ação é registrada com quem, quando, o quê |

---

## 2. ANÁLISE DO SISTEMA ATUAL

### ✅ O que JÁ EXISTE

| Item | Status | Localização |
|------|--------|-------------|
| Enum `Role` | ✅ | `schema.prisma` linha 377 |
| `RolesGuard` | ✅ | `/auth/guards/roles.guard.ts` |
| `JwtAuthGuard` | ✅ | `/auth/guards/jwt-auth.guard.ts` |
| 14 Módulos Backend | ✅ | `/backend/src/modules/` |
| 20 Páginas Admin | ✅ | `/frontend/src/app/admin/` |
| Sidebar com Menus | ✅ | `AdminSidebar.tsx` |

### ❌ O que NÃO EXISTE

| Item | Status |
|------|--------|
| Tabela `Permission` | ❌ |
| Tabela `RolePermission` | ❌ |
| Tabela `AuditLog` | ❌ |
| UI de configuração de permissões | ❌ |
| Guard de permissões granulares | ❌ |
| Verificação de permissões no frontend | ❌ |

### 📊 Roles Atuais (schema.prisma)

```prisma
enum Role {
  SUPER_ADMIN    # Super Admin (dono do sistema)
  COMPANY_ADMIN  # Admin da Empresa
  MANAGER        # Gerente
  HR             # Recursos Humanos (Human Resources)
  EMPLOYEE       # Funcionário
  FINANCIAL      # Financeiro
}
```

---

## 3. ARQUITETURA PROPOSTA

### 🏗️ Modelo: RBAC + ACL por Módulo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA DE PERMISSÕES                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │    USER     │
                              │  (role)     │
                              └──────┬──────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │        ROLE_PERMISSION         │
                    │   (companyId + role + perm)    │
                    └────────────────┬───────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ PERMISSION  │
                              │ (module +   │
                              │  action)    │
                              └─────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   ┌───────────┐              ┌───────────┐              ┌───────────┐
   │  MODULE   │              │  MODULE   │              │  MODULE   │
   │ employees │              │  payroll  │              │ overtime  │
   └───────────┘              └───────────┘              └───────────┘
         │                           │                           │
    ┌────┴────┐                 ┌────┴────┐                 ┌────┴────┐
    │ ACTIONS │                 │ ACTIONS │                 │ ACTIONS │
    ├─────────┤                 ├─────────┤                 ├─────────┤
    │ view    │                 │ view    │                 │ view    │
    │ create  │                 │ create  │                 │ approve │
    │ edit    │                 │ edit    │                 │ reject  │
    │ delete  │                 │ approve │                 └─────────┘
    └─────────┘                 │ export  │
                                └─────────┘
```

### 🔑 Características

1. **Permissões por Empresa**: Cada empresa configura suas próprias permissões
2. **Permissões por Role**: Não por usuário individual (simplifica gestão)
3. **Granularidade por Módulo**: Cada módulo tem suas ações específicas
4. **Herança de Permissões**: SUPER_ADMIN e COMPANY_ADMIN herdam tudo automaticamente

---

## 4. MAPEAMENTO COMPLETO DE PERMISSÕES

### 📦 Módulos do Sistema

Baseado na análise dos controllers e páginas do frontend:

| # | Módulo | Chave | Descrição | Controller |
|---|--------|-------|-----------|------------|
| 1 | Dashboard | `dashboard` | Visão geral da empresa | - |
| 2 | Funcionários | `employees` | Gestão de funcionários | `employees.controller.ts` |
| 3 | Registros de Ponto | `time_entries` | Visualizar/editar pontos | `time-entries.controller.ts` |
| 4 | Hora Extra | `overtime` | Aprovação de hora extra | `overtime.controller.ts` |
| 5 | Folha de Pagamento | `payroll` | Holerites e pagamentos | `payroll.controller.ts` |
| 6 | Adiantamentos/Vales | `advances` | Solicitações de vale | `payroll.controller.ts` |
| 7 | Departamentos | `departments` | Gestão de departamentos | `departments.controller.ts` |
| 8 | Cargos | `positions` | Gestão de cargos | `positions.controller.ts` |
| 9 | Cercas Geográficas | `geofences` | Configurar cercas | `geofences.controller.ts` |
| 10 | Mensagens | `messages` | Sistema de mensagens | `messages.controller.ts` |
| 11 | Alertas | `alerts` | Visualizar alertas | `alerts.controller.ts` |
| 12 | Conformidade CLT | `compliance` | Dashboard de conformidade | `compliance.controller.ts` |
| 13 | Configurações | `settings` | Configurações da empresa | `app-settings.controller.ts` |
| 14 | Permissões | `permissions` | Gerenciar permissões | **NOVO** |
| 15 | Logs de Auditoria | `audit` | Visualizar logs | **NOVO** |
| 16 | Terminal de Ponto | `terminal` | Bater ponto pelo admin | - |

### 🎬 Ações por Módulo

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AÇÕES DISPONÍVEIS POR MÓDULO                                    │
├─────────────────────┬───────┬────────┬──────┬────────┬─────────┬────────┬──────────────────┤
│ Módulo              │ view  │ create │ edit │ delete │ approve │ export │ Ações Especiais  │
├─────────────────────┼───────┼────────┼──────┼────────┼─────────┼────────┼──────────────────┤
│ dashboard           │  ✅   │   -    │  -   │   -    │    -    │   -    │                  │
│ employees           │  ✅   │   ✅   │  ✅  │   ✅   │    -    │   ✅   │ manage_face      │
│ time_entries        │  ✅   │   ✅   │  ✅  │   ✅   │    -    │   ✅   │                  │
│ overtime            │  ✅   │   -    │  -   │   -    │   ✅    │   ✅   │ reject           │
│ payroll             │  ✅   │   ✅   │  ✅  │   -    │   ✅    │   ✅   │ pay, generate    │
│ advances            │  ✅   │   ✅   │  -   │   ✅   │   ✅    │   -    │ reject           │
│ departments         │  ✅   │   ✅   │  ✅  │   ✅   │    -    │   -    │                  │
│ positions           │  ✅   │   ✅   │  ✅  │   ✅   │    -    │   -    │                  │
│ geofences           │  ✅   │   ✅   │  ✅  │   ✅   │    -    │   -    │                  │
│ messages            │  ✅   │   ✅   │  -   │   -    │    -    │   -    │                  │
│ alerts              │  ✅   │   -    │  -   │   -    │    -    │   -    │                  │
│ compliance          │  ✅   │   -    │  ✅  │   -    │    -    │   ✅   │                  │
│ settings            │  ✅   │   -    │  ✅  │   -    │    -    │   -    │                  │
│ permissions         │  ✅   │   -    │  ✅  │   -    │    -    │   -    │                  │
│ audit               │  ✅   │   -    │  -   │   -    │    -    │   ✅   │                  │
│ terminal            │  ✅   │   -    │  -   │   -    │    -    │   -    │ clock_in         │
└─────────────────────┴───────┴────────┴──────┴────────┴─────────┴────────┴──────────────────┘
```

### 📋 Lista Completa de Permissões (Permission Keys)

```typescript
// Total: 52 permissões

// DASHBOARD (1)
'dashboard.view'

// FUNCIONÁRIOS (6)
'employees.view'
'employees.create'
'employees.edit'
'employees.delete'
'employees.export'
'employees.manage_face'     // Cadastrar/excluir face

// REGISTROS DE PONTO (5)
'time_entries.view'
'time_entries.create'       // Registrar ponto manual
'time_entries.edit'         // Editar ponto existente
'time_entries.delete'
'time_entries.export'

// HORA EXTRA (4)
'overtime.view'
'overtime.approve'
'overtime.reject'
'overtime.export'

// FOLHA DE PAGAMENTO (7)
'payroll.view'
'payroll.create'            // Criar folha
'payroll.edit'              // Editar holerite
'payroll.approve'           // Aprovar folha
'payroll.pay'               // Marcar como pago
'payroll.generate'          // Gerar holerites
'payroll.export'

// ADIANTAMENTOS/VALES (5)
'advances.view'
'advances.create'           // Criar solicitação
'advances.approve'
'advances.reject'
'advances.delete'           // Cancelar

// DEPARTAMENTOS (4)
'departments.view'
'departments.create'
'departments.edit'
'departments.delete'

// CARGOS (4)
'positions.view'
'positions.create'
'positions.edit'
'positions.delete'

// CERCAS GEOGRÁFICAS (4)
'geofences.view'
'geofences.create'
'geofences.edit'
'geofences.delete'

// MENSAGENS (2)
'messages.view'
'messages.create'

// ALERTAS (1)
'alerts.view'

// CONFORMIDADE CLT (3)
'compliance.view'
'compliance.edit'
'compliance.export'

// CONFIGURAÇÕES (2)
'settings.view'
'settings.edit'

// PERMISSÕES (2)
'permissions.view'
'permissions.edit'

// LOGS DE AUDITORIA (2)
'audit.view'
'audit.export'

// TERMINAL DE PONTO (2)
'terminal.view'
'terminal.clock_in'         // Bater ponto pelo terminal
```

### 🎨 Matriz de Permissões Padrão (Configurável)

Esta é a configuração **INICIAL** que será aplicada quando uma empresa for criada.  
O admin pode **MODIFICAR** todas essas permissões no painel.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MATRIZ DE PERMISSÕES PADRÃO                                               │
│                          (Configurável pelo Admin no Painel de Permissões)                                   │
├─────────────────────────┬─────────────┬─────────────┬─────────┬────────┬────────────┬──────────────────────┤
│ Permissão               │ SUPER_ADMIN │ COMPANY_ADM │ MANAGER │   HR   │ FINANCIAL  │ EMPLOYEE (próprio)   │
│                         │   (FIXO)    │   (FIXO)    │ (config)│(config)│  (config)  │      (FIXO)          │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ DASHBOARD               │             │             │         │        │            │                      │
│ dashboard.view          │     ✅      │     ✅      │   ✅    │   ✅   │     ✅     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ FUNCIONÁRIOS            │             │             │         │        │            │                      │
│ employees.view          │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ employees.create        │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ employees.edit          │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ employees.delete        │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ employees.export        │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ employees.manage_face   │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ REGISTROS DE PONTO      │             │             │         │        │            │                      │
│ time_entries.view       │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │    ✅ (próprio)      │
│ time_entries.create     │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │    ✅ (próprio)      │
│ time_entries.edit       │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ time_entries.delete     │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ time_entries.export     │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ HORA EXTRA              │             │             │         │        │            │                      │
│ overtime.view           │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │    ✅ (próprio)      │
│ overtime.approve        │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ overtime.reject         │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ overtime.export         │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ FOLHA DE PAGAMENTO      │             │             │         │        │            │                      │
│ payroll.view            │     ✅      │     ✅      │   ❌    │   ✅   │     ✅     │    ✅ (holerite)     │
│ payroll.create          │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ payroll.edit            │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ payroll.approve         │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ payroll.pay             │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ payroll.generate        │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ payroll.export          │     ✅      │     ✅      │   ❌    │   ✅   │     ✅     │    ✅ (próprio)      │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ ADIANTAMENTOS/VALES     │             │             │         │        │            │                      │
│ advances.view           │     ✅      │     ✅      │   ❌    │   ✅   │     ✅     │    ✅ (próprio)      │
│ advances.create         │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │    ✅ (próprio)      │
│ advances.approve        │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ advances.reject         │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
│ advances.delete         │     ✅      │     ✅      │   ❌    │   ❌   │     ✅     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ DEPARTAMENTOS           │             │             │         │        │            │                      │
│ departments.view        │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ departments.create      │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ departments.edit        │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ departments.delete      │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ CARGOS                  │             │             │         │        │            │                      │
│ positions.view          │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ positions.create        │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ positions.edit          │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
│ positions.delete        │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ CERCAS GEOGRÁFICAS      │             │             │         │        │            │                      │
│ geofences.view          │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ geofences.create        │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ geofences.edit          │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ geofences.delete        │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ MENSAGENS               │             │             │         │        │            │                      │
│ messages.view           │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │    ✅ (próprio)      │
│ messages.create         │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │    ✅ (próprio)      │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ ALERTAS                 │             │             │         │        │            │                      │
│ alerts.view             │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ CONFORMIDADE CLT        │             │             │         │        │            │                      │
│ compliance.view         │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ compliance.edit         │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ compliance.export       │     ✅      │     ✅      │   ❌    │   ✅   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ CONFIGURAÇÕES           │             │             │         │        │            │                      │
│ settings.view           │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ settings.edit           │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ PERMISSÕES              │             │             │         │        │            │                      │
│ permissions.view        │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ permissions.edit        │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ LOGS DE AUDITORIA       │             │             │         │        │            │                      │
│ audit.view              │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
│ audit.export            │     ✅      │     ✅      │   ❌    │   ❌   │     ❌     │         ❌           │
├─────────────────────────┼─────────────┼─────────────┼─────────┼────────┼────────────┼──────────────────────┤
│ TERMINAL DE PONTO       │             │             │         │        │            │                      │
│ terminal.view           │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
│ terminal.clock_in       │     ✅      │     ✅      │   ✅    │   ✅   │     ❌     │         ❌           │
└─────────────────────────┴─────────────┴─────────────┴─────────┴────────┴────────────┴──────────────────────┘

LEGENDA:
✅ = Permissão concedida por padrão
❌ = Permissão negada por padrão
(FIXO) = Não pode ser alterado pelo admin
(config) = Pode ser alterado pelo admin no painel
(próprio) = Acesso apenas aos próprios dados no painel do funcionário
```

---

## 5. ESTRUTURA DO BANCO DE DADOS

### 📊 Novas Tabelas

```prisma
// ============================================
// TABELA: Permission (Permissões do Sistema)
// ============================================
// Armazena todas as permissões disponíveis
// Populada via seed (não editável pelo admin)

model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  module      String   // employees, payroll, overtime, etc.
  action      String   // view, create, edit, delete, approve, etc.
  key         String   @unique // employees.view, payroll.approve
  description String   // "Visualizar funcionários"
  createdAt   DateTime @default(now())
  
  rolePermissions RolePermission[]
  
  @@unique([module, action])
  @@map("permissions")
}

// ============================================
// TABELA: RolePermission (Permissões por Role)
// ============================================
// Relaciona permissões com roles POR EMPRESA
// Editável pelo admin no painel

model RolePermission {
  id           String     @id @default(uuid()) @db.Uuid
  companyId    String     @db.Uuid
  role         Role       // MANAGER, HR, FINANCIAL (não SUPER_ADMIN nem COMPANY_ADMIN)
  permissionId String     @db.Uuid
  granted      Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  company      Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, role, permissionId])
  @@index([companyId, role])
  @@map("role_permissions")
}

// ============================================
// TABELA: AuditLog (Logs de Auditoria)
// ============================================
// Registra TODAS as ações do sistema
// Respaldo jurídico

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.Uuid
  userId      String   @db.Uuid
  userName    String   // Nome do usuário (para histórico)
  userRole    Role     // Role no momento da ação
  action      String   // CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, APPROVE, REJECT
  module      String   // employees, payroll, time_entries, etc.
  entityId    String?  // ID do registro afetado
  entityName  String?  // Nome/descrição do registro (para histórico)
  oldData     Json?    // Dados antes da alteração
  newData     Json?    // Dados depois da alteração
  ip          String?  // IP do usuário
  userAgent   String?  // Navegador/dispositivo
  timestamp   DateTime @default(now())
  
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([companyId, timestamp])
  @@index([companyId, module])
  @@index([userId])
  @@index([module, entityId])
  @@map("audit_logs")
}
```

### 🔗 Relacionamentos

```prisma
// Adicionar em Company:
model Company {
  // ... campos existentes ...
  rolePermissions  RolePermission[]
  auditLogs        AuditLog[]
}

// Adicionar em User:
model User {
  // ... campos existentes ...
  auditLogs        AuditLog[]
}
```

---

## 6. FLUXO DE FUNCIONAMENTO

### 🔐 Fluxo de Verificação de Permissão

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE VERIFICAÇÃO DE PERMISSÃO                        │
└─────────────────────────────────────────────────────────────────────────────┘

         REQUISIÇÃO: GET /api/employees
                        │
                        ▼
              ┌──────────────────┐
              │  JwtAuthGuard    │ → Verifica se está logado
              └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ PermissionGuard  │ → @RequirePermission('employees.view')
              └──────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │ 1. Pegar user.role do token          │
         │                                      │
         │ 2. Se SUPER_ADMIN ou COMPANY_ADMIN:  │
         │    → PERMITIDO (bypass)              │
         │                                      │
         │ 3. Se EMPLOYEE:                      │
         │    → NEGADO (não acessa admin)       │
         │                                      │
         │ 4. Se MANAGER/HR/FINANCIAL:          │
         │    → Buscar RolePermission           │
         │      WHERE companyId = user.company  │
         │      AND role = user.role            │
         │      AND permission.key = 'employees.view' │
         │    → Verificar se granted = true     │
         └──────────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
          PERMITIDO            NEGADO
              │                   │
              ▼                   ▼
         Continua            403 Forbidden
         execução            + Log de auditoria
              │
              ▼
         Log de auditoria
         (se ação de escrita)
```

### 🔄 Fluxo de Login Inteligente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE LOGIN                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                              USUÁRIO FAZ LOGIN
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   Verificar user.role  │
                        └────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
    EMPLOYEE                  MANAGER/HR/FINANCIAL          SUPER_ADMIN
         │                           │                      COMPANY_ADMIN
         │                           │                           │
         ▼                           ▼                           ▼
   Redireciona para          Modal: "Qual painel?"         Redireciona para
   Painel Pessoal            ┌──────────────────┐          Painel Admin
   /{empresa}/{slug}         │ 🏢 Painel Admin  │          /admin/{empresa}
                             │ 👤 Meu Painel    │
                             └──────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                   Painel Admin              Painel Pessoal
                   /admin/{empresa}          /{empresa}/{slug}
                        │
                        ▼
                   Carregar permissões
                   do role na empresa
```

---

## 7. INTERFACE DE CONFIGURAÇÃO

### 🎨 Página de Permissões

**Localização:** `/admin/{empresa}/configuracoes/permissoes`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Configurações > Permissões                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Selecione o grupo para configurar:                                         │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │  👔 Gerente │ │  👥 RH      │ │ 💰Financeiro│                           │
│  │  (MANAGER)  │ │  (HR)       │ │ (FINANCIAL) │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│       ▲ selecionado                                                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📦 FUNCIONÁRIOS                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ☑️ Visualizar funcionários          employees.view                   │  │
│  │ ☐ Criar funcionários                employees.create                 │  │
│  │ ☐ Editar funcionários               employees.edit                   │  │
│  │ ☐ Excluir funcionários              employees.delete                 │  │
│  │ ☐ Exportar lista                    employees.export                 │  │
│  │ ☐ Gerenciar reconhecimento facial   employees.manage_face            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  📦 REGISTROS DE PONTO                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ☑️ Visualizar registros             time_entries.view                │  │
│  │ ☑️ Registrar ponto manual           time_entries.create              │  │
│  │ ☐ Editar registros                  time_entries.edit                │  │
│  │ ☐ Excluir registros                 time_entries.delete              │  │
│  │ ☑️ Exportar relatórios              time_entries.export              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  📦 HORA EXTRA                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ☑️ Visualizar horas extras          overtime.view                    │  │
│  │ ☑️ Aprovar horas extras             overtime.approve                 │  │
│  │ ☑️ Rejeitar horas extras            overtime.reject                  │  │
│  │ ☐ Exportar relatórios               overtime.export                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ... (outros módulos)                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    [ Salvar Alterações ]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎨 Página de Logs de Auditoria

**Localização:** `/admin/{empresa}/configuracoes/auditoria`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 Logs de Auditoria                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filtros:                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Usuário ▼    │ │ Módulo ▼     │ │ Ação ▼       │ │ Período ▼    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Data/Hora        │ Usuário      │ Ação    │ Módulo      │ Detalhes  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 02/12 14:32:15   │ João Silva   │ UPDATE  │ employees   │ [Ver]     │   │
│  │ 02/12 14:30:00   │ Maria RH     │ CREATE  │ employees   │ [Ver]     │   │
│  │ 02/12 14:25:10   │ Admin        │ APPROVE │ overtime    │ [Ver]     │   │
│  │ 02/12 14:20:00   │ João Silva   │ LOGIN   │ auth        │ [Ver]     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [ Exportar CSV ]  [ Exportar PDF ]                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. IMPACTO NO SISTEMA

### 📊 Análise de Impacto

| Área | Impacto | Descrição |
|------|---------|-----------|
| **Banco de Dados** | 🟡 Médio | 3 novas tabelas + relações + seed |
| **Backend** | 🟡 Médio | Novo módulo + guard + interceptor |
| **Frontend** | 🟡 Médio | Context + hook + UI de config |
| **Controllers** | 🟢 Baixo | Adicionar decorators |
| **Sidebar** | 🟢 Baixo | Filtrar por permissão |
| **Performance** | 🟢 Baixo | Cache de permissões no login |

### 📁 Arquivos a Criar/Modificar

```
BACKEND (Criar):
├── src/modules/permissions/
│   ├── permissions.module.ts
│   ├── permissions.controller.ts
│   ├── permissions.service.ts
│   └── dto/
│       └── update-role-permissions.dto.ts
├── src/modules/audit/
│   ├── audit.module.ts
│   ├── audit.controller.ts
│   ├── audit.service.ts
│   └── audit.interceptor.ts
├── src/common/guards/
│   └── permission.guard.ts
├── src/common/decorators/
│   └── require-permission.decorator.ts
└── prisma/
    └── seed-permissions.ts

BACKEND (Modificar):
├── prisma/schema.prisma (adicionar tabelas)
├── src/modules/employees/employees.controller.ts (adicionar decorators)
├── src/modules/payroll/payroll.controller.ts (adicionar decorators)
├── src/modules/time-entries/time-entries.controller.ts (adicionar decorators)
├── ... (todos os controllers)

FRONTEND (Criar):
├── src/contexts/PermissionContext.tsx
├── src/hooks/usePermissions.ts
└── src/app/admin/[company]/configuracoes/
    ├── permissoes/page.tsx
    └── auditoria/page.tsx

FRONTEND (Modificar):
├── src/components/admin/AdminSidebar.tsx (filtrar por permissão)
├── src/app/admin/[company]/funcionarios/page.tsx (ocultar botões)
├── ... (todas as páginas admin)
```

---

## 9. PLANO DE IMPLEMENTAÇÃO

### 📅 Cronograma Estimado

| Fase | Descrição | Tempo |
|------|-----------|-------|
| **1** | Banco de Dados (tabelas + seed) | 0.5 dia |
| **2** | Backend - Guard e Decorators | 1 dia |
| **3** | Backend - Módulo Permissions | 0.5 dia |
| **4** | Backend - Módulo Audit | 0.5 dia |
| **5** | Backend - Aplicar em Controllers | 1 dia |
| **6** | Frontend - Context e Hook | 0.5 dia |
| **7** | Frontend - UI de Permissões | 1 dia |
| **8** | Frontend - UI de Auditoria | 0.5 dia |
| **9** | Frontend - Aplicar em Componentes | 1 dia |
| **10** | Redirecionamento de Login | 0.5 dia |
| **11** | Testes e Ajustes | 1 dia |
| **TOTAL** | | **~8 dias** |

### 🔄 Ordem de Implementação

```
1. BANCO DE DADOS
   └── Criar tabelas Permission, RolePermission, AuditLog
   └── Criar seed com todas as 52 permissões
   └── Criar seed com permissões padrão por role

2. BACKEND - INFRAESTRUTURA
   └── Criar PermissionGuard
   └── Criar @RequirePermission decorator
   └── Criar AuditInterceptor

3. BACKEND - MÓDULOS
   └── Criar PermissionsModule (CRUD de RolePermission)
   └── Criar AuditModule (listagem de logs)

4. BACKEND - APLICAR
   └── Adicionar @RequirePermission em todos os endpoints
   └── Adicionar AuditInterceptor em operações de escrita

5. FRONTEND - INFRAESTRUTURA
   └── Criar PermissionContext
   └── Criar usePermissions hook
   └── Carregar permissões no login

6. FRONTEND - UI
   └── Criar página de configuração de permissões
   └── Criar página de logs de auditoria
   └── Adicionar no menu de configurações

7. FRONTEND - APLICAR
   └── Filtrar itens do sidebar por permissão
   └── Ocultar botões sem permissão
   └── Bloquear rotas sem permissão

8. REDIRECIONAMENTO
   └── Implementar modal de escolha de painel
   └── Implementar redirecionamento por role
```

---

## 10. PERGUNTAS PARA APROVAÇÃO

### ✅ Confirme os seguintes pontos:

1. **A matriz de permissões padrão está correta?**
   - Posso ajustar qualquer permissão antes de implementar

2. **O modelo por MÓDULO está aprovado?**
   - Cada módulo tem ações: view, create, edit, delete, approve, export
   - Permite ocultar botões específicos (ex: só ocultar botão "Excluir")

3. **SUPER_ADMIN e COMPANY_ADMIN sempre têm TODAS as permissões?**
   - Fixo no código, não configurável

4. **EMPLOYEE nunca acessa o painel admin?**
   - Apenas painel do funcionário (próprios dados)

5. **MANAGER, HR, FINANCIAL podem acessar painel pessoal?**
   - Modal de escolha após login

6. **Os logs de auditoria registram TUDO?**
   - CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, APPROVE, REJECT

7. **Posso começar a implementação?**

---

## 📝 NOTAS ADICIONAIS

### Sobre HR vs RH
- No código: `HR` (padrão internacional em inglês)
- Na interface: "Recursos Humanos" ou "RH" (traduzido para o usuário)

### Sobre Granularidade
- O sistema permite ocultar botões específicos
- Exemplo: MANAGER pode ter `employees.view` mas não `employees.delete`
- Isso oculta apenas o botão "Excluir" na lista de funcionários

### Sobre Permissões do Funcionário
- No painel do funcionário, ele sempre vê seus próprios dados
- Não precisa de permissão para ver próprio holerite, ponto, etc.
- As permissões são apenas para o painel admin

---

**Documento criado por:** Cascade AI  
**Versão:** 1.0  
**Aguardando aprovação para implementação**
