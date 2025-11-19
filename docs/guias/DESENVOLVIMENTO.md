# 📱 Sistema WebPonto - Documentação de Desenvolvimento

> **Prazo:** 1 mês (início: 19/10/2025)  
> **Stack:** Next.js + NestJS + PostgreSQL + MinIO + CompreFace + Redis

---

## 🎯 Visão Geral

Sistema completo de ponto eletrônico com reconhecimento facial e gestão empresarial, funcionando **online e offline** com sincronização automática.

### Público-Alvo
- Pequenas, médias e grandes empresas
- Arquitetura **multi-empresa** (SaaS)

### Diferenciais
- ✅ Funcionamento offline completo
- ✅ Reconhecimento facial (CompreFace)
- ✅ Sincronização automática em tempo real
- ✅ Gestão RH + Financeiro integrada
- ✅ Cálculo automático de folha e encargos (INSS, FGTS, IRRF)

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Frontend**
- Next.js 14+ (App Router)
- PWA (next-pwa + Service Workers)
- IndexedDB (Dexie.js) para dados offline
- TailwindCSS + shadcn/ui
- Socket.IO Client (tempo real)

**Backend**
- NestJS
- Prisma ORM
- JWT + Passport (autenticação)
- Socket.IO (WebSocket)
- BullMQ + Redis (filas)

**Infraestrutura**
- PostgreSQL 15+
- MinIO (armazenamento S3-compatible)
- CompreFace (reconhecimento facial)
- Redis (cache + filas)
- Docker + Docker Compose

---

## 📋 Módulos

### 1. Landing Page (Vendas)
- Página institucional
- Planos e preços
- Trial/demonstração
- Gateway de pagamento

### 2. Painel Admin SaaS
- Gestão de empresas clientes
- Controle de assinaturas
- Analytics e métricas
- Suporte

### 3. Portal da Empresa

#### 3.1 Gestão de Colaboradores
- Cadastro completo de funcionários
- Upload foto + reconhecimento facial
- Cargos, departamentos, hierarquia
- Documentos e contratos

#### 3.2 Controle de Ponto
- Batida com reconhecimento facial
- **Modo offline** (IndexedDB + sincronização)
- Ajustes e justificativas
- Banco de horas e horas extras

#### 3.3 Férias e Afastamentos
- Solicitação e aprovação
- Licenças e atestados
- Períodos aquisitivos

#### 3.4 Folha de Pagamento
- Cálculo automático de salários
- Horas extras e adicionais
- Descontos (INSS, IRRF)
- Encargos patronais (FGTS 8%, INSS 20%+)
- 13º e férias proporcionais
- Geração de holerites
- Exportação eSocial

#### 3.5 Financeiro
- Fluxo de caixa (entradas/saídas)
- Contas a pagar/receber
- Custo real do funcionário
- Centro de custos
- Integração com folha

#### 3.6 Relatórios
- Ponto por funcionário/período
- Horas extras e absenteísmo
- Custos trabalhistas
- Dashboards gerenciais
- Exportação PDF/Excel

---

## 🔄 Funcionamento Offline/Online

### Estratégia

**1. Armazenamento Local (IndexedDB)**
```typescript
{
  pontos: [{
    id: "temp_001",
    funcionarioId: 123,
    timestamp: "2025-10-19T08:00:00Z",
    tipo: "entrada",
    foto: "base64...",
    geolocalizacao: { lat, lng },
    status: "pendente" // pendente | sincronizado | invalido
  }]
}
```

**2. Fluxo Offline**
1. Captura foto via câmera
2. Armazena no IndexedDB
3. Service Worker monitora conexão
4. Quando online → sincroniza automático

**3. Processamento no Servidor**
```typescript
async syncPoint(data) {
  // 1. Upload foto → MinIO
  // 2. Validar reconhecimento → CompreFace
  // 3. Salvar ponto → PostgreSQL
  // 4. Emitir WebSocket → atualiza outros dispositivos
  // 5. Se inválido → notificar gestor
}
```

**4. Atualização Tempo Real**
```typescript
socket.on('ponto:novo', (data) => {
  // Atualiza UI sem reload
  // Atualiza IndexedDB local
  // Toast de notificação
});
```

### Segurança Offline

**Problema:** Login offline pode ser inseguro

**Soluções:**
1. **Device Binding** - registrar dispositivo único
2. **Token com validade** - expira em 7 dias, requer reauth online
3. **PIN local** - exigir PIN para uso offline
4. **Validação posterior** - servidor valida todos pontos offline
5. **Auditoria** - log completo + geolocalização obrigatória

---

## 🗄️ Modelagem de Dados

### Entidades Principais

```prisma
// Principais tabelas

model Empresa {
  id              Int
  cnpj            String @unique
  razaoSocial     String
  planoId         Int
  ativo           Boolean
  dataAssinatura  DateTime
}

model Usuario {
  id          Int
  empresaId   Int
  email       String @unique
  senha       String
  role        Role
}

enum Role {
  SUPER_ADMIN      // Admin do SaaS
  ADMIN_EMPRESA    // Admin da empresa
  GESTOR
  RH
  FUNCIONARIO
  FINANCEIRO
}

model Dispositivo {
  id                String @id @default(uuid())
  usuarioId         Int
  deviceFingerprint String
  pinHash           String?  // PIN offline
}

model Funcionario {
  id              Int
  empresaId       Int
  matricula       String
  nome            String
  cpf             String @unique
  dataAdmissao    DateTime
  salarioBase     Decimal
  faceId          String?  // ID no CompreFace
  faceRegistrada  Boolean
}

model Ponto {
  id                   Int
  empresaId            Int
  funcionarioId        Int
  timestamp            DateTime
  tipo                 TipoPonto
  fotoUrl              String?
  reconhecimentoValido Boolean
  similarity           Float?
  latitude             Float?
  longitude            Float?
  sincronizado         Boolean
  status               StatusPonto
}

enum TipoPonto {
  ENTRADA
  SAIDA
  INICIO_INTERVALO
  FIM_INTERVALO
}

enum StatusPonto {
  VALIDO
  PENDENTE
  INVALIDO
  AJUSTADO
  SUSPEITO
}

model FolhaPagamento {
  id              Int
  funcionarioId   Int
  mesReferencia   Int
  anoReferencia   Int
  salarioBase     Decimal
  horasExtras50   Decimal
  totalProventos  Decimal
  inss            Decimal
  irrf            Decimal
  totalDescontos  Decimal
  salarioLiquido  Decimal
  fgts            Decimal // 8%
  inssPatronal    Decimal // ~20%
  custoTotal      Decimal
}

model LancamentoFinanceiro {
  id          Int
  empresaId   Int
  tipo        TipoLancamento // RECEITA | DESPESA
  descricao   String
  valor       Decimal
  data        DateTime
  status      StatusLancamento
}
```

---

## 🐳 Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/webponto
      - MINIO_ENDPOINT=minio:9000
      - COMPREFACE_URL=http://compreface:8000
      - REDIS_HOST=redis
    depends_on: [postgres, redis, minio, compreface]

  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]

  compreface:
    image: exadel/compreface
    ports: ["8000:8000"]

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 📦 Bibliotecas Principais

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

---

## 🚀 Próximos Passos

### Fase 1: Estrutura Base (Semana 1)
- [ ] Setup do projeto (Docker + Next + Nest)
- [ ] Configuração do banco (Prisma schema)
- [ ] Autenticação JWT
- [ ] CRUD básico de empresas e usuários

### Fase 2: Ponto Offline (Semana 2)
- [ ] Integração CompreFace
- [ ] IndexedDB + Service Worker
- [ ] Sincronização automática
- [ ] WebSocket tempo real

### Fase 3: RH e Folha (Semana 3)
- [ ] Gestão de funcionários
- [ ] Controle de jornada
- [ ] Cálculo de folha de pagamento
- [ ] Relatórios

### Fase 4: Financeiro e Landing (Semana 4)
- [ ] Fluxo de caixa
- [ ] Landing page
- [ ] Painel admin SaaS
- [ ] Testes e ajustes finais

---

## 📝 Notas de Desenvolvimento

### Decisões Arquiteturais
1. **Separação front/back:** melhor escalabilidade e manutenção
2. **IndexedDB:** suporte offline robusto
3. **WebSocket:** atualizações em tempo real sem polling
4. **BullMQ:** processamento assíncrono (upload, facial)
5. **Multiempresa:** isolamento por empresaId

### Desafios Identificados
- Sincronização offline com conflitos
- Validação facial posterior (fraude)
- Cálculo preciso de encargos trabalhistas
- Segurança do login offline
- Escalabilidade do WebSocket

---

**Última atualização:** 19/10/2025  
**Status:** Em desenvolvimento
