# 📚 DOCUMENTAÇÃO PRINCIPAL - WEBPONTO

> **Sistema de Ponto Eletrônico com Reconhecimento Facial**  
> **Versão:** 1.0  
> **Última atualização:** 14/01/2026

---

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Roadmap e Plano do Projeto](#2-roadmap-e-plano-do-projeto)
3. [Arquitetura](#3-arquitetura)
   - 3.1 [Arquitetura Geral](#31-arquitetura-geral)
   - 3.2 [Arquitetura de Autenticação](#32-arquitetura-de-autenticação)
   - 3.3 [Fluxo de Geofences](#33-fluxo-de-geofences)
   - 3.4 [Sistema de Slug por Empresa](#34-sistema-de-slug-por-empresa)
4. [Sistema de Permissões](#4-sistema-de-permissões)
5. [Conformidade CLT](#5-conformidade-clt)
6. [Liveness Detection (Prova de Vida)](#6-liveness-detection-prova-de-vida)
7. [Guia de Desenvolvimento](#7-guia-de-desenvolvimento)
8. [Manual do Usuário](#8-manual-do-usuário)
9. [FAQ - Perguntas Frequentes](#9-faq---perguntas-frequentes)

---

# 1. VISÃO GERAL DO SISTEMA

Sistema completo de controle de ponto com reconhecimento facial, funcionamento offline/online e gestão empresarial integrada.

## 🚀 Quick Start

### Gerenciador de Processos (Recomendado):

```bash
cd /root/Apps/webponto

# Gerenciador interativo de processos
./manage-processes.sh
# ou simplesmente
./pm
```

### Modo Fácil (Scripts):

```bash
cd /root/Apps/webponto/scripts

./iniciar.sh    # Iniciar projeto
./ver-logs.sh   # Ver logs
./status.sh     # Ver status
./parar.sh      # Parar projeto
```

### Modo Manual:

```bash
cd /root/Apps/webponto

docker compose up -d      # Iniciar
docker compose logs -f    # Ver logs
docker compose down       # Parar
```

## 🌐 Acessar Aplicações

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Backend API | http://localhost:4000 | - |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin123` |
| CompreFace UI | http://localhost:8081 | - |
| CompreFace API | http://localhost:8080 | - |
| PostgreSQL | localhost:5432 | - |
| Redis | localhost:6379 | - |

## 📂 Estrutura do Projeto

```
webponto/
├── backend/              # NestJS API
├── frontend/             # Next.js + PWA
├── scripts/              # Scripts utilitários
├── docker-compose.yml    # Config Docker
└── DOCUMENTACAO-PRINCIPAL.md  # Esta documentação
```

## 🛠️ Tecnologias

- **Frontend:** Next.js 14, TailwindCSS, PWA
- **Backend:** NestJS, Prisma, Socket.IO
- **Infraestrutura:** PostgreSQL, Redis, MinIO, CompreFace
- **Deploy:** Docker + Docker Compose

## 👥 Módulos

- Landing Page (vendas)
- Painel Admin SaaS
- Gestão de Colaboradores
- Controle de Ponto (offline/online)
- Folha de Pagamento
- Financeiro
- Relatórios

---

# 2. ROADMAP E PLANO DO PROJETO

## 📍 Status Atual

```
✅ FASE 1: RECONHECIMENTO FACIAL - 100% COMPLETO!
✅ FASE 2: BACKEND REAL - 100% COMPLETO!
✅ FASE 3: DASHBOARD E RELATÓRIOS - 100% COMPLETO!
✅ FASE 4: GESTÃO DE FUNCIONÁRIOS - 100% COMPLETO!
✅ FASE 5: MULTI-TENANT - 100% COMPLETO!
🔄 FASE 6: RECURSOS AVANÇADOS - EM PROGRESSO
⏳ FASE 7: DEVOPS E PRODUÇÃO - PENDENTE
```

## 🎯 Fases do Projeto

### FASE 1: Reconhecimento Facial ✅ COMPLETA

- ✅ Login de funcionários
- ✅ Cadastro de face (CompreFace)
- ✅ Reconhecimento facial
- ✅ Registro de ponto com lógica inteligente
- ✅ Ambiguidade (escolher entre Intervalo/Saída)
- ✅ Validação de sequência (ENTRADA → INTERVALO → SAÍDA)
- ✅ Horários configuráveis por funcionário

### FASE 2: Backend Real ✅ COMPLETA

- ✅ Persistência no PostgreSQL
- ✅ Endpoints de pontos
- ✅ Histórico de pontos
- ✅ Sincronização entre dispositivos

### FASE 3: Dashboard e Relatórios ✅ COMPLETA

- ✅ Dashboard do Funcionário
- ✅ Dashboard do Admin
- ✅ Relatórios por funcionário/período
- ✅ Gráficos e estatísticas

### FASE 4: Gestão de Funcionários ✅ COMPLETA

- ✅ CRUD de Funcionários
- ✅ Configurações por Funcionário
- ✅ Departamentos e Cargos
- ✅ Gestão de Acesso (RBAC)

### FASE 5: Multi-tenant ✅ COMPLETA

- ✅ Cadastro de Empresas
- ✅ Isolamento de Dados
- ✅ Configurações Globais por empresa

### FASE 6: Recursos Avançados 🔄 EM PROGRESSO

- ✅ Geolocalização
- ✅ Cercas Geográficas
- ⏳ QR Code
- ✅ App Mobile (PWA)
- ✅ Folha de Pagamento
- ⏳ API Pública (Swagger)
- ⏳ Notificações por Email

### FASE 7: DevOps e Produção ⏳ PENDENTE

- ⏳ HTTPS obrigatório
- ⏳ Rate limiting
- ⏳ Helmet (headers de segurança)
- ⏳ Backup automático
- ⏳ CI/CD

## 🎯 MVP (Minimum Viable Product)

Para lançar a primeira versão:
- ✅ Fase 1: Reconhecimento Facial
- ✅ Fase 2: Backend Real
- ✅ Fase 3: Dashboard básico
- ⏳ Fase 7: Segurança e Deploy

---

# 3. ARQUITETURA

## 3.1 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIO FINAL                        │
│              (Desktop, Mobile, Tablet)                  │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTPS
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS (Frontend)                     │
│  - PWA (Service Worker)                                 │
│  - IndexedDB (Dados Offline)                            │
│  - Socket.IO Client (Tempo Real)                        │
│  - React Query (Cache/Sincronização)                    │
└───────────────────┬─────────────────────────────────────┘
                    │ REST API + WebSocket
                    ▼
┌─────────────────────────────────────────────────────────┐
│                 NESTJS (Backend)                        │
│  - Controllers (REST)                                   │
│  - WebSocket Gateway (Socket.IO)                        │
│  - Services (Lógica de Negócio)                         │
│  - Jobs/Queue (BullMQ)                                  │
└───────────┬──────────┬──────────┬──────────┬────────────┘
            │          │          │          │
            ▼          ▼          ▼          ▼
      ┌─────────┐ ┌────────┐ ┌───────┐ ┌──────────┐
      │PostgreSQL│ │  Redis │ │ MinIO │ │CompreFace│
      │   DB    │ │Cache+Q │ │  S3   │ │  Facial  │
      └─────────┘ └────────┘ └───────┘ └──────────┘
```

### Camadas do Sistema

**1. Apresentação (Frontend)**
- Responsabilidade: Interface do usuário, PWA, offline-first
- Tecnologias: Next.js, React, TailwindCSS
- Dados locais: IndexedDB via Dexie.js

**2. Aplicação (Backend API)**
- Responsabilidade: Lógica de negócio, validação, orquestração
- Tecnologias: NestJS, Socket.IO, BullMQ
- Padrão: Controller → Service → Repository

**3. Domínio (Business Logic)**
- Responsabilidade: Regras de negócio puras
- Exemplos: Cálculo de horas extras, Validação de jornada, Cálculo de folha

**4. Infraestrutura**
- Persistência: PostgreSQL (Prisma ORM)
- Armazenamento: MinIO (S3-compatible)
- Cache/Fila: Redis + BullMQ
- IA: CompreFace (reconhecimento facial)

### Segurança

**Autenticação:**
- JWT com expiração de 7 dias
- Refresh token para renovação
- Device binding (registro de dispositivos)

**Autorização (RBAC):**
```typescript
enum Role {
  SUPER_ADMIN,      // Admin do SaaS
  COMPANY_ADMIN,    // Admin da empresa cliente
  MANAGER,          // Gestor de equipe
  HR,               // Recursos Humanos
  EMPLOYEE,         // Colaborador
  FINANCIAL         // Acesso ao módulo financeiro
}
```

**Proteções:**
- HTTPS obrigatório (TLS)
- CORS configurado
- Rate limiting
- Validação de input (class-validator)
- SQL Injection protection (Prisma)

---

## 3.2 Arquitetura de Autenticação

### Tipos de Usuários (Roles)

| Role | Nome | Descrição | Acesso |
|------|------|-----------|--------|
| `SUPER_ADMIN` | Super Administrador | Acesso total ao sistema | Todas as empresas |
| `COMPANY_ADMIN` | Administrador da Empresa | Acesso total à sua empresa | Sua empresa |
| `MANAGER` | Gerente | Gestão de equipe | Painel Admin (limitado) + Painel Pessoal |
| `HR` | Recursos Humanos | Gestão de pessoas | Painel Admin (limitado) + Painel Pessoal |
| `FINANCIAL` | Financeiro | Gestão financeira | Painel Admin (limitado) + Painel Pessoal |
| `EMPLOYEE` | Funcionário | Uso pessoal | Apenas Painel Pessoal |

### Endpoints de Autenticação

**POST /api/auth/login**

Request:
```json
{
  "email": "admin@acme-tech.com.br",
  "password": "senha123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-do-usuario",
    "email": "admin@acme-tech.com.br",
    "name": "João Silva",
    "role": "COMPANY_ADMIN",
    "companyId": "uuid-da-empresa",
    "company": {
      "id": "uuid-da-empresa",
      "slug": "acme-tech",
      "tradeName": "ACME Tech",
      "cnpj": "12345678000190"
    },
    "employee": null
  }
}
```

### Fluxo de Navegação

**Para EMPLOYEE:**
- Login → Redireciona automaticamente para o Painel Pessoal

**Para MANAGER, HR, FINANCIAL:**
- Login → Modal de escolha aparece:
  - 🏢 **Painel Administrativo**
  - 👤 **Meu Painel**

**Para SUPER_ADMIN, COMPANY_ADMIN:**
- Login → Redireciona automaticamente para o Painel Administrativo

---

## 3.3 Fluxo de Geofences

### O que são Geofences?

**Geofence** (cerca geográfica) é uma área circular definida por:
- **Centro**: Latitude e Longitude (coordenadas GPS)
- **Raio**: Distância em metros a partir do centro
- **Nome**: Identificação da cerca (ex: "Entrada Principal")

### Fluxo Completo

**1. Criar uma Geofence:**
1. Acesse `/admin/{slug}/cercas-geograficas`
2. Preencha nome, endereço, coordenadas e raio
3. Clique em "Salvar geofence"

**2. Associar Geofence a um Funcionário:**
1. Acesse a tela de edição do funcionário
2. No campo "Geofence", selecione a cerca desejada
3. Salve as alterações

**3. Bater Ponto com Geofence:**
1. Sistema captura a localização GPS do dispositivo
2. Calcula a distância entre a localização atual e o centro da geofence
3. Valida se está dentro do raio:
   - ✅ **Dentro**: Permite bater ponto
   - ❌ **Fora**: Bloqueia e mostra mensagem de erro

### Exemplo Prático

**Cenário: Empresa com 2 filiais**

| Filial | Centro | Raio |
|--------|--------|------|
| Filial Centro | -23.550520, -46.633308 | 200m |
| Filial Zona Sul | -23.654321, -46.712345 | 300m |

**Funcionários:**
- João → Associado à "Filial Centro"
- Maria → Associada à "Filial Zona Sul"
- Pedro → Sem geofence (pode bater ponto de qualquer lugar)

---

## 3.4 Sistema de Slug por Empresa

### O que é Slug?

**Slug** é um identificador amigável usado na URL, derivado do nome da empresa.

**Exemplos:**
- `"ACME Tech Ltda"` → `"acme-tech-ltda"`
- `"Minha Empresa S/A"` → `"minha-empresa-sa"`

### Por que usar Slug?

- **URL amigável**: `/admin/acme-tech` ao invés de `/admin/uuid-longo`
- **SEO**: URLs legíveis são melhores para busca
- **UX**: Usuário identifica a empresa pela URL

### Rotas que usam Slug

**Admin (empresa logada):**
- `/admin/{slug}/dashboard`
- `/admin/{slug}/funcionarios`
- `/admin/{slug}/cercas-geograficas`

**Funcionário (bater ponto):**
- `/{slug}/{employee}`
- Exemplo: `/acme-tech/joao-silva`

---

# 4. SISTEMA DE PERMISSÕES

## Resumo

Sistema de permissões **RBAC + ACL** (Role-Based Access Control + Access Control List):
- **Configurável** pelo painel do admin
- **Flexível** para permitir ajustes granulares por módulo
- **Auditável** com logs de todas as ações
- **Seguro** com controle de acesso em múltiplas camadas

## Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **SUPER_ADMIN** | Sempre tem TODAS as permissões (fixo) |
| **COMPANY_ADMIN** | Sempre tem TODAS as permissões da empresa (fixo) |
| **Outros Roles** | Permissões configuráveis pelo admin no painel |
| **EMPLOYEE** | Acesso apenas ao painel do funcionário (próprios dados) |
| **Auditoria** | Toda ação é registrada com quem, quando, o quê |

## Módulos do Sistema

| # | Módulo | Chave | Descrição |
|---|--------|-------|-----------|
| 1 | Dashboard | `dashboard` | Visão geral da empresa |
| 2 | Funcionários | `employees` | Gestão de funcionários |
| 3 | Registros de Ponto | `time_entries` | Visualizar/editar pontos |
| 4 | Hora Extra | `overtime` | Aprovação de hora extra |
| 5 | Folha de Pagamento | `payroll` | Holerites e pagamentos |
| 6 | Adiantamentos/Vales | `advances` | Solicitações de vale |
| 7 | Departamentos | `departments` | Gestão de departamentos |
| 8 | Cargos | `positions` | Gestão de cargos |
| 9 | Cercas Geográficas | `geofences` | Configurar cercas |
| 10 | Mensagens | `messages` | Sistema de mensagens |
| 11 | Alertas | `alerts` | Visualizar alertas |
| 12 | Conformidade CLT | `compliance` | Dashboard de conformidade |
| 13 | Configurações | `settings` | Configurações da empresa |
| 14 | Permissões | `permissions` | Gerenciar permissões |
| 15 | Logs de Auditoria | `audit` | Visualizar logs |
| 16 | Terminal de Ponto | `terminal` | Bater ponto pelo admin |

## Ações por Módulo

Cada módulo pode ter as seguintes ações:
- `view` - Visualizar
- `create` - Criar
- `edit` - Editar
- `delete` - Excluir
- `approve` - Aprovar
- `export` - Exportar

## Onde as Permissões São Aplicadas

1. **Sidebar (Menu Lateral)** - Menus só aparecem se o usuário tem permissão `módulo.view`
2. **Páginas** - Cada página verifica a permissão antes de renderizar
3. **Botões de Ação** - Botões de criar, editar, excluir só aparecem com a permissão correspondente

---

# 5. CONFORMIDADE CLT

## 3 Modos de Conformidade

### 1️⃣ FULL (Conformidade Total) 🔒

- ✅ **SEMPRE BLOQUEIA** se violar qualquer regra CLT
- ✅ Valida TODAS as regras automaticamente
- ✅ Não permite configuração individual

**Quando Usar:** Empresas que precisam seguir CLT rigorosamente

### 2️⃣ FLEXIBLE (Flexível) 🟡

- ✅ **NUNCA BLOQUEIA** (sempre permite)
- ⚠️ **APENAS AVISA** sobre violações
- ✅ Registra violações para análise posterior

**Quando Usar:** Empresas com horários flexíveis, startups

### 3️⃣ CUSTOM (Customizado) ⚙️

- ✅ **VOCÊ ESCOLHE** quais regras validar
- ✅ **VOCÊ ESCOLHE** se bloqueia ou apenas avisa
- ✅ Máxima flexibilidade

**Configurações:**

| Checkbox | Quando MARCADO ✅ | Quando DESMARCADO ❌ |
|----------|-------------------|----------------------|
| Validar horas de trabalho | Valida máximo 10h/dia | Ignora |
| Validar período de descanso | Valida mínimo 11h entre jornadas | Ignora |
| Validar regras de hora extra | Valida máximo 2h extras/dia | Ignora |
| Apenas avisar, não bloquear | Apenas avisa | Bloqueia |

## Tabela Resumo

| Modo | Regra Ativa? | Apenas Avisar? | Resultado |
|------|--------------|----------------|-----------|
| **FULL** | ✅ Todas | ❌ Não | ❌ **BLOQUEIA** |
| **FLEXIBLE** | ✅ Todas | ✅ Sim | ✅ **PERMITE** + ⚠️ Avisa |
| **CUSTOM** | ✅ Sim | ✅ Sim | ✅ **PERMITE** + ⚠️ Avisa |
| **CUSTOM** | ✅ Sim | ❌ Não | ❌ **BLOQUEIA** |
| **CUSTOM** | ❌ Não | - | ✅ **PERMITE** (ignora) |

---

# 6. LIVENESS DETECTION (PROVA DE VIDA)

## O que é Prova de Vida?

A prova de vida (liveness) é uma validação que garante que a pessoa está **realmente presente** na frente da câmera, e não é uma foto, vídeo ou máscara.

## Como Funciona?

O sistema analisa **4 critérios** em tempo real:

### 1. Piscar (Blink Detection) - 25 pontos
- ✅ **Detectado:** Rosto fica estável por 15+ frames (~0.5 segundos)
- **Como passar:** Fique parado olhando para a câmera por 1 segundo

### 2. Movimento (Movement Detection) - 25 pontos
- ✅ **Detectado:** Movimento suave da cabeça (20+ pixels)
- **Como passar:** Mova a cabeça levemente (esquerda/direita)

### 3. Estabilidade (Face Stable) - 25 pontos
- ✅ **Detectado:** Rosto relativamente parado (variância < 40)
- **Como passar:** Mantenha a cabeça relativamente parada

### 4. Qualidade (Quality Good) - 25 pontos
- ✅ **Detectado:** Rosto grande na tela (50%+) e boa confiança (70%+)
- **Como passar:** Aproxime o rosto da câmera e melhore a iluminação

## Validação Final

```
Score = blinkDetected (25) + movementDetected (25) + faceStable (25) + qualityGood (25)

✅ VÁLIDO: Score >= 50 (2+ critérios atendidos)
❌ INVÁLIDO: Score < 50 (menos de 2 critérios)
```

## Dicas para Passar

1. **Iluminação:** Use luz natural ou lâmpada na frente
2. **Distância:** Rosto deve ocupar 50%+ da tela
3. **Movimento:** Leve e suave (não brusco)
4. **Estabilidade:** Segure a cabeça firme (sem tremer)
5. **Tempo:** Aguarde 2-3 segundos antes de tentar

---

# 7. GUIA DE DESENVOLVIMENTO

## Stack Tecnológico

### Frontend (Next.js)
- `next-pwa` - PWA support
- `dexie` - IndexedDB wrapper
- `socket.io-client` - WebSocket
- `@tanstack/react-query` - Data fetching
- `tailwindcss` + `shadcn/ui` - UI
- `lucide-react` - Ícones
- `zod` - Validação
- `react-hook-form` - Formulários

### Backend (NestJS)
- `@nestjs/websockets` + `socket.io` - WebSocket
- `@nestjs/bull` + `bullmq` - Filas
- `@prisma/client` - ORM
- `@nestjs/jwt` + `passport-jwt` - Auth
- `multer` - Upload
- `minio` - S3 client
- `axios` - HTTP client (CompreFace)
- `class-validator` + `class-transformer` - Validação

## Comandos Úteis

### Backend
```bash
cd backend

npm run start:dev          # Hot reload
npm run prisma:migrate     # Rodar migrations
npm run prisma:studio      # Interface visual do banco
npm run prisma:generate    # Gerar Prisma Client
npm run test               # Testes unitários
npm run test:e2e           # Testes E2E
```

### Frontend
```bash
cd frontend

npm run dev               # Hot reload
npm run build             # Build de produção
npm run start             # Rodar build
npm run lint              # ESLint
```

### Docker
```bash
docker-compose up -d      # Subir
docker-compose down       # Parar
docker-compose logs -f    # Logs
docker-compose build --no-cache  # Reconstruir imagens
```

## Padrões de Código

### Backend (NestJS)
- **Código:** 100% INGLÊS (variáveis, funções, classes)
- **Comentários:** 100% PORTUGUÊS
- **Rotas da API:** 100% INGLÊS (ex: /api/time-entries)
- **Mensagens de erro:** PORTUGUÊS (para o usuário final)

### Frontend (Next.js)
- **Código:** 100% INGLÊS (componentes, hooks, funções)
- **Comentários:** 100% PORTUGUÊS
- **Rotas do frontend:** 100% PORTUGUÊS (ex: /funcionarios)
- **Textos da interface:** 100% PORTUGUÊS

## WebSocket - Regra Obrigatória

Todo dado que vem do banco de dados DEVE ser atualizado em tempo real via WebSocket.

**Backend (NestJS):**
```typescript
// Após criar/atualizar/deletar, emitir evento:
this.eventsGateway.emitToCompany(companyId, 'employee-updated', employee)
```

**Frontend (React):**
```typescript
// No useEffect, escutar eventos:
const { onEmployeeUpdated } = useWebSocket()

useEffect(() => {
  const unsubscribe = onEmployeeUpdated((data) => {
    if (data.id === employeeId) {
      setEmployeeData(data)
    }
  })
  return () => unsubscribe()
}, [])
```

---

# 8. MANUAL DO USUÁRIO

## Tipos de Usuário

| Role | Nome | Descrição | Acesso |
|------|------|-----------|--------|
| `SUPER_ADMIN` | Super Administrador | Acesso total ao sistema | Todas as empresas |
| `COMPANY_ADMIN` | Administrador da Empresa | Acesso total à sua empresa | Sua empresa |
| `MANAGER` | Gerente | Gestão de equipe | Painel Admin (limitado) + Painel Pessoal |
| `HR` | Recursos Humanos | Gestão de pessoas | Painel Admin (limitado) + Painel Pessoal |
| `FINANCIAL` | Financeiro | Gestão financeira | Painel Admin (limitado) + Painel Pessoal |
| `EMPLOYEE` | Funcionário | Uso pessoal | Apenas Painel Pessoal |

## Painel Administrativo

### Dashboard
Visão geral da empresa com:
- Total de funcionários
- Registros de hoje
- Funcionários com reconhecimento facial
- Funcionários com ponto remoto
- Horas extras pendentes
- Alertas

### Gestão de Colaboradores

**Funcionários:**
- Lista de todos os funcionários
- Adicionar novo funcionário
- Editar dados do funcionário
- Gerenciar reconhecimento facial
- Configurar ponto remoto

**Cargos e Departamentos:**
- Lista de cargos/departamentos da empresa
- Criar, editar e excluir

**Folha de Pagamento:**
- Gerar folha do mês
- Visualizar holerites
- Aprovar e pagar folha

**Vales:**
- Lista de solicitações de vale
- Aprovar ou rejeitar vales

**Terminal de Ponto:**
- Registrar ponto de funcionários
- Usar reconhecimento facial

**Cercas Geográficas:**
- Definir áreas permitidas para ponto remoto
- Configurar raio de tolerância

### Análises

**Registros:**
- Histórico de todos os registros de ponto
- Filtrar por funcionário, data, tipo

**Hora Extra:**
- Lista de horas extras
- Aprovar ou rejeitar
- Exportar relatório

**Conformidade CLT:**
- Verificar conformidade com a legislação
- Alertas de irregularidades

### Configurações da Empresa

- Dashboard (personalizar cards)
- Folha de Pagamento (dia de fechamento, adicionais)
- Conformidade CLT (regras, tolerâncias)
- Aplicativo (configurações gerais)
- Permissões (gerenciar por role)
- Auditoria (logs de ações)

## Painel do Funcionário

### Bater Ponto
- Registrar entrada
- Registrar saída
- Registrar intervalos

### Meus Registros
- Histórico de pontos
- Ver horas trabalhadas

### Holerite
- Visualizar holerites
- Baixar PDF

### Mensagens
- Comunicados da empresa
- Notificações pessoais

---

# 9. FAQ - PERGUNTAS FREQUENTES

## Sobre o Sistema

### O que é o WebPonto?
Sistema completo de ponto eletrônico com reconhecimento facial, desenvolvido com Next.js (frontend) e NestJS (backend).

### Quais tecnologias usa?
- **Frontend:** Next.js 14, React, TailwindCSS
- **Backend:** NestJS, Prisma ORM
- **Banco:** PostgreSQL
- **Reconhecimento Facial:** CompreFace
- **Infraestrutura:** Docker

## Problemas Comuns

### "Câmera não funciona"

**Possíveis causas:**

**A) HTTP em vez de HTTPS**
```
❌ http://192.168.1.100:3000 (câmera bloqueada)
✅ http://localhost:3000 (funciona)
✅ https://seudominio.com (funciona)
```

**B) Permissão negada**
1. Clique no ícone 🔒 (cadeado) na barra de endereço
2. Permitir câmera
3. Recarregue a página

**C) Câmera em uso**
Feche outros apps que usam câmera.

### "Login não funciona"

**Credenciais padrão:**
```
Email: joao.silva@empresateste.com.br
Senha: senha123
```

**Se não funcionar:**
1. Verifique se backend está rodando: `docker compose ps`
2. Veja logs: `docker compose logs backend`

## Desenvolvimento

### Como rodar o projeto?
```bash
cd /root/Apps/webponto/scripts
./iniciar.sh
```

### Como ver logs?
```bash
./ver-logs.sh
```

### Como parar o projeto?
```bash
./parar.sh
```

### Como acessar o banco?
```bash
# Via Prisma Studio
http://localhost:5555

# Via psql
docker compose exec postgres psql -U webponto -d webponto_db
```

## Compatibilidade

### Funciona em celular?
- ✅ Interface responsiva (funciona)
- ✅ PWA instalável

### Quais navegadores funcionam?
- ✅ Google Chrome (recomendado)
- ✅ Microsoft Edge
- ✅ Firefox
- ⚠️ Safari (pode ter problemas com câmera)
- ❌ Internet Explorer (não suportado)

## Suporte

### Como reportar bugs?
1. Anote o que aconteceu
2. Tire screenshot
3. Abra console (F12) e copie erros
4. Informe: Navegador, Sistema operacional, Passos para reproduzir

### Logs importantes:
```bash
docker compose logs backend | tail -100   # Backend
docker compose logs frontend | tail -100  # Frontend
docker compose logs postgres | tail -100  # Banco
```

---

**📝 Licença:** Proprietary - Todos os direitos reservados

**📅 Última atualização:** 14/01/2026
