# 📖 MANUAL DO USUÁRIO - WEBPONTO

> **Sistema de Ponto Eletrônico**  
> **Versão:** 1.0  
> **Última atualização:** 07/12/2024

---

## 📋 ÍNDICE

1. [Introdução](#introdução)
2. [Tipos de Usuário](#tipos-de-usuário)
3. [Sistema de Permissões](#sistema-de-permissões)
4. [Painel Administrativo](#painel-administrativo)
5. [Painel do Funcionário](#painel-do-funcionário)
6. [Funcionalidades por Módulo](#funcionalidades-por-módulo)

---

## 1. INTRODUÇÃO

O WebPonto é um sistema completo de gestão de ponto eletrônico que permite:
- Registro de ponto (entrada, saída, intervalos)
- Gestão de funcionários
- Controle de horas extras
- Folha de pagamento
- Gestão de vales/adiantamentos
- Conformidade com a CLT

---

## 2. TIPOS DE USUÁRIO

O sistema possui 5 tipos de usuário (roles):

| Role | Nome | Descrição | Acesso |
|------|------|-----------|--------|
| `SUPER_ADMIN` | Super Administrador | Acesso total ao sistema | Todas as empresas |
| `COMPANY_ADMIN` | Administrador da Empresa | Acesso total à sua empresa | Sua empresa |
| `MANAGER` | Gerente | Gestão de equipe | Painel Admin (limitado) + Painel Pessoal |
| `HR` | Recursos Humanos | Gestão de pessoas | Painel Admin (limitado) + Painel Pessoal |
| `FINANCIAL` | Financeiro | Gestão financeira | Painel Admin (limitado) + Painel Pessoal |
| `EMPLOYEE` | Funcionário | Uso pessoal | Apenas Painel Pessoal |

### 2.1 Fluxo de Login

**Para EMPLOYEE:**
- Login → Redireciona automaticamente para o Painel Pessoal

**Para MANAGER, HR, FINANCIAL:**
- Login → Modal de escolha aparece:
  - 🏢 **Painel Administrativo** - Gerenciar funcionários, registros e relatórios
  - 👤 **Meu Painel** - Bater ponto, ver holerite e mensagens

**Para SUPER_ADMIN, COMPANY_ADMIN:**
- Login → Redireciona automaticamente para o Painel Administrativo

> 📸 **[IMAGEM: Tela de Login]**  
> 📸 **[IMAGEM: Modal de Escolha de Painel]**

---

## 3. SISTEMA DE PERMISSÕES

### 3.1 Como Funciona

O sistema usa permissões granulares no formato `módulo.ação`:
- `dashboard.view` - Visualizar dashboard
- `employees.create` - Criar funcionários
- `payroll.approve` - Aprovar folha de pagamento

### 3.2 Matriz de Permissões por Role

#### MANAGER (Gerente)

| Módulo | view | create | edit | delete | Outras |
|--------|:----:|:------:|:----:|:------:|--------|
| Dashboard | ✅ | - | - | - | - |
| Funcionários | ✅ | ❌ | ❌ | ❌ | - |
| Registros de Ponto | ✅ | ✅ | ❌ | ❌ | export ✅ |
| Hora Extra | ✅ | - | - | - | approve ✅, reject ✅ |
| Folha de Pagamento | ❌ | ❌ | ❌ | ❌ | - |
| Vales | ❌ | ❌ | ❌ | ❌ | - |
| Departamentos | ✅ | ❌ | ❌ | ❌ | - |
| Cargos | ✅ | ❌ | ❌ | ❌ | - |
| Cercas Geográficas | ✅ | ❌ | ❌ | ❌ | - |
| Terminal de Ponto | ✅ | - | - | - | clock_in ✅ |
| Alertas | ✅ | - | - | - | - |
| Conformidade CLT | ✅ | - | ❌ | - | - |
| Configurações | ❌ | - | ❌ | - | - |
| Permissões | ❌ | - | ❌ | - | - |
| Auditoria | ❌ | - | - | - | - |

#### HR (Recursos Humanos)

| Módulo | view | create | edit | delete | Outras |
|--------|:----:|:------:|:----:|:------:|--------|
| Dashboard | ✅ | - | - | - | - |
| Funcionários | ✅ | ✅ | ✅ | ❌ | export ✅, manage_face ✅ |
| Registros de Ponto | ✅ | ✅ | ✅ | ❌ | export ✅ |
| Hora Extra | ✅ | - | - | - | approve ✅, reject ✅, export ✅ |
| Folha de Pagamento | ✅ | ❌ | ❌ | ❌ | export ✅ |
| Vales | ✅ | ✅ | - | ❌ | approve ❌ |
| Departamentos | ✅ | ✅ | ✅ | ❌ | - |
| Cargos | ✅ | ✅ | ✅ | ❌ | - |
| Cercas Geográficas | ✅ | ❌ | ❌ | ❌ | - |
| Terminal de Ponto | ✅ | - | - | - | clock_in ✅ |
| Alertas | ✅ | - | - | - | - |
| Conformidade CLT | ✅ | - | ❌ | - | export ✅ |
| Configurações | ❌ | - | ❌ | - | - |
| Permissões | ❌ | - | ❌ | - | - |
| Auditoria | ❌ | - | - | - | - |

#### FINANCIAL (Financeiro)

| Módulo | view | create | edit | delete | Outras |
|--------|:----:|:------:|:----:|:------:|--------|
| Dashboard | ✅ | - | - | - | - |
| Funcionários | ❌ | ❌ | ❌ | ❌ | - |
| Registros de Ponto | ❌ | ❌ | ❌ | ❌ | - |
| Hora Extra | ❌ | - | - | - | - |
| Folha de Pagamento | ✅ | ✅ | ✅ | ❌ | approve ✅, pay ✅, generate ✅, export ✅ |
| Vales | ✅ | ❌ | - | ✅ | approve ✅, reject ✅ |
| Departamentos | ❌ | ❌ | ❌ | ❌ | - |
| Cargos | ❌ | ❌ | ❌ | ❌ | - |
| Cercas Geográficas | ❌ | ❌ | ❌ | ❌ | - |
| Terminal de Ponto | ❌ | - | - | - | - |
| Alertas | ❌ | - | - | - | - |
| Conformidade CLT | ❌ | - | ❌ | - | - |
| Configurações | ❌ | - | ❌ | - | - |
| Permissões | ❌ | - | ❌ | - | - |
| Auditoria | ❌ | - | - | - | - |

### 3.3 Onde as Permissões São Aplicadas

1. **Sidebar (Menu Lateral)**
   - Menus só aparecem se o usuário tem permissão `módulo.view`
   
2. **Páginas**
   - Cada página verifica a permissão antes de renderizar
   - Se não tem permissão, redireciona para a primeira página permitida
   
3. **Botões de Ação**
   - Botões de criar, editar, excluir só aparecem com a permissão correspondente

> 📸 **[IMAGEM: Sidebar com menus visíveis para cada role]**

---

## 4. PAINEL ADMINISTRATIVO

### 4.1 Dashboard

Visão geral da empresa com:
- Total de funcionários
- Registros de hoje
- Funcionários com reconhecimento facial
- Funcionários com ponto remoto
- Horas extras pendentes
- Alertas

> 📸 **[IMAGEM: Dashboard do Admin]**

### 4.2 Gestão de Colaboradores

#### 4.2.1 Funcionários
- Lista de todos os funcionários
- Adicionar novo funcionário
- Editar dados do funcionário
- Gerenciar reconhecimento facial
- Configurar ponto remoto

> 📸 **[IMAGEM: Lista de Funcionários]**  
> 📸 **[IMAGEM: Modal de Adicionar Funcionário]**

#### 4.2.2 Cargos
- Lista de cargos da empresa
- Criar, editar e excluir cargos

#### 4.2.3 Departamentos
- Lista de departamentos
- Criar, editar e excluir departamentos

#### 4.2.4 Folha de Pagamento
- Gerar folha do mês
- Visualizar holerites
- Aprovar e pagar folha

> 📸 **[IMAGEM: Folha de Pagamento]**

#### 4.2.5 Vales
- Lista de solicitações de vale
- Aprovar ou rejeitar vales

#### 4.2.6 Terminal de Ponto
- Registrar ponto de funcionários
- Usar reconhecimento facial

#### 4.2.7 Cercas Geográficas
- Definir áreas permitidas para ponto remoto
- Configurar raio de tolerância

### 4.3 Análises

#### 4.3.1 Registros
- Histórico de todos os registros de ponto
- Filtrar por funcionário, data, tipo

#### 4.3.2 Hora Extra
- Lista de horas extras
- Aprovar ou rejeitar
- Exportar relatório

#### 4.3.3 Conformidade CLT
- Verificar conformidade com a legislação
- Alertas de irregularidades

### 4.4 Alertas
- Notificações do sistema
- Alertas de conformidade
- Avisos importantes

### 4.5 Configurações da Empresa

#### 4.5.1 Dashboard
- Personalizar cards do dashboard
- Escolher métricas exibidas

#### 4.5.2 Folha de Pagamento
- Configurar dia de fechamento
- Definir adicionais e descontos

#### 4.5.3 Conformidade CLT
- Configurar regras de conformidade
- Definir tolerâncias

#### 4.5.4 Aplicativo
- Configurações gerais do app

#### 4.5.5 Permissões
- Gerenciar permissões por role
- Personalizar acessos

#### 4.5.6 Auditoria
- Logs de ações do sistema
- Histórico de alterações

---

## 5. PAINEL DO FUNCIONÁRIO

### 5.1 Bater Ponto
- Registrar entrada
- Registrar saída
- Registrar intervalos

> 📸 **[IMAGEM: Tela de Bater Ponto]**

### 5.2 Meus Registros
- Histórico de pontos
- Ver horas trabalhadas

### 5.3 Holerite
- Visualizar holerites
- Baixar PDF

### 5.4 Mensagens
- Comunicados da empresa
- Notificações pessoais

---

## 6. FUNCIONALIDADES POR MÓDULO

### 6.1 Registro de Ponto

**Tipos de registro:**
- `CLOCK_IN` - Entrada
- `CLOCK_OUT` - Saída
- `BREAK_START` - Início do intervalo
- `BREAK_END` - Fim do intervalo

**Métodos de registro:**
- Manual (pelo admin)
- Terminal de ponto
- Reconhecimento facial
- Ponto remoto (com geolocalização)

### 6.2 Hora Extra

**Status:**
- `PENDING` - Pendente de aprovação
- `APPROVED` - Aprovada
- `REJECTED` - Rejeitada

**Fluxo:**
1. Sistema detecta hora extra automaticamente
2. Gerente/RH aprova ou rejeita
3. Se aprovada, entra na folha de pagamento

### 6.3 Folha de Pagamento

**Status:**
- `DRAFT` - Rascunho
- `GENERATED` - Gerada
- `APPROVED` - Aprovada
- `PAID` - Paga

**Fluxo:**
1. Financeiro gera a folha
2. Financeiro aprova
3. Financeiro marca como paga

---

## 📝 NOTAS DE VERSÃO

### v1.0 (07/12/2024)
- Sistema de permissões implementado
- Painel administrativo completo
- Painel do funcionário
- Reconhecimento facial
- Ponto remoto com geolocalização

---

## 🔗 REFERÊNCIAS

- [Documento de Testes de Permissões](./TESTES_PERMISSOES.md)
- [Seed de Permissões](../backend/prisma/seed-permissions.ts)

