# Arquitetura do Sistema WebPonto

## 📐 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIO FINAL                        │
│              (Desktop, Mobile, Tablet)                  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ HTTPS
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS (Frontend)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  - PWA (Service Worker)                         │   │
│  │  - IndexedDB (Dados Offline)                    │   │
│  │  - Socket.IO Client (Tempo Real)                │   │
│  │  - React Query (Cache/Sincronização)            │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ REST API + WebSocket
                    ▼
┌─────────────────────────────────────────────────────────┐
│                 NESTJS (Backend)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Controllers (REST)                             │   │
│  │  ├─ /auth                                       │   │
│  │  ├─ /empresas                                   │   │
│  │  ├─ /funcionarios                               │   │
│  │  ├─ /pontos (+ /sync para offline)              │   │
│  │  ├─ /folha                                      │   │
│  │  └─ /financeiro                                 │   │
│  │                                                  │   │
│  │  WebSocket Gateway (Socket.IO)                  │   │
│  │  ├─ ponto:novo                                  │   │
│  │  ├─ funcionario:atualizado                      │   │
│  │  └─ notificacao                                 │   │
│  │                                                  │   │
│  │  Services (Lógica de Negócio)                   │   │
│  │  ├─ AuthService                                 │   │
│  │  ├─ PontoService                                │   │
│  │  ├─ ComprefaceService                           │   │
│  │  ├─ MinioService                                │   │
│  │  ├─ FolhaService                                │   │
│  │  └─ SyncService                                 │   │
│  │                                                  │   │
│  │  Jobs/Queue (BullMQ)                            │   │
│  │  ├─ ProcessarFotoQueue                          │   │
│  │  ├─ ValidarReconhecimentoQueue                  │   │
│  │  ├─ CalcularFolhaQueue                          │   │
│  │  └─ NotificacaoQueue                            │   │
│  └─────────────────────────────────────────────────┘   │
└───────────┬──────────┬──────────┬──────────┬────────────┘
            │          │          │          │
            ▼          ▼          ▼          ▼
      ┌─────────┐ ┌────────┐ ┌───────┐ ┌──────────┐
      │PostgreSQL│ │  Redis │ │ MinIO │ │CompreFace│
      │   DB    │ │Cache+Q │ │  S3   │ │  Facial  │
      └─────────┘ └────────┘ └───────┘ └──────────┘
```

---

## 🔄 Fluxo de Sincronização Offline → Online

### 1. **Usuário Offline**

```
┌──────────────┐
│   Câmera     │ → Captura foto
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│    Frontend (Next.js)                │
│                                      │
│  1. Reconhece dispositivo sem rede  │
│  2. Captura:                         │
│     - Foto (base64)                  │
│     - Timestamp                      │
│     - Geolocalização                 │
│     - Tipo (entrada/saída)           │
│  3. Salva no IndexedDB               │
│     status: "pendente"               │
└──────────────────────────────────────┘
```

### 2. **Conexão Retorna**

```
┌──────────────────────────────────────┐
│   Service Worker / App               │
│                                      │
│  1. Detecta: navigator.onLine = true│
│  2. Busca pontos pendentes          │
│  3. Envia via POST /api/pontos/sync │
└──────────┬───────────────────────────┘
           │
           │ HTTP POST
           ▼
┌──────────────────────────────────────┐
│        Backend (NestJS)              │
│                                      │
│  /api/pontos/sync                   │
│                                      │
│  1. Valida dados recebidos          │
│  2. Enfileira job de processamento  │
│  3. Retorna confirmação rápida      │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│    BullMQ Job Processor              │
│                                      │
│  JOB: ProcessarPontoOffline         │
│                                      │
│  1. Upload foto → MinIO             │
│     └─ bucket: "pontos"             │
│     └─ retorna: photoUrl            │
│                                      │
│  2. Validar facial → CompreFace     │
│     POST /api/v1/recognition/verify │
│     └─ retorna: {                   │
│          verified: true,            │
│          similarity: 0.98           │
│        }                             │
│                                      │
│  3. Salvar no PostgreSQL            │
│     INSERT INTO pontos (...)        │
│                                      │
│  4. Emitir WebSocket                │
│     socket.emit('ponto:novo', data) │
│                                      │
│  5. Se inválido → notificar gestor  │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│    Outros Clientes Conectados        │
│                                      │
│  socket.on('ponto:novo', (data) => { │
│    // Atualiza UI em tempo real     │
│    updatePontosList(data)           │
│    showToast('Novo ponto registrado')│
│  })                                  │
└──────────────────────────────────────┘
```

---

## 🔐 Fluxo de Autenticação

### Login Online

```
[Cliente] → POST /auth/login { email, senha }
              ↓
         [NestJS AuthService]
              ↓
         Valida credenciais (PostgreSQL)
              ↓
         Gera JWT token (7 dias validade)
              ↓
         Retorna: {
           accessToken,
           refreshToken,
           user: { id, nome, role, empresaId }
         }
              ↓
         [Cliente]
         └─ Salva token no localStorage
         └─ Salva dados no IndexedDB
         └─ Configura header Authorization
```

### Login Offline (Validação Local)

```
[Cliente] → Usuário já fez login antes
              ↓
         Busca no IndexedDB:
         - Token JWT
         - Dados do usuário
         - PIN local (se configurado)
              ↓
         Se token não expirado:
         └─ Permite acesso offline
              ↓
         Se token expirado:
         └─ Bloqueia, exige reauth online
              ↓
         (Opcional) Valida PIN local
         └─ Camada extra de segurança
```

---

## 📊 Camadas do Sistema

### **1. Apresentação (Frontend)**
- **Responsabilidade:** Interface do usuário, PWA, offline-first
- **Tecnologias:** Next.js, React, TailwindCSS
- **Dados locais:** IndexedDB via Dexie.js

### **2. Aplicação (Backend API)**
- **Responsabilidade:** Lógica de negócio, validação, orquestração
- **Tecnologias:** NestJS, Socket.IO, BullMQ
- **Padrão:** Controller → Service → Repository

### **3. Domínio (Business Logic)**
- **Responsabilidade:** Regras de negócio puras
- **Exemplos:**
  - Cálculo de horas extras
  - Validação de jornada
  - Cálculo de folha (INSS, FGTS, IRRF)

### **4. Infraestrutura**
- **Persistência:** PostgreSQL (Prisma ORM)
- **Armazenamento:** MinIO (S3-compatible)
- **Cache/Fila:** Redis + BullMQ
- **IA:** CompreFace (reconhecimento facial)

---

## 🛡️ Segurança

### **Autenticação**
- JWT com expiração de 7 dias
- Refresh token para renovação
- Device binding (registro de dispositivos)
- PIN local para modo offline

### **Autorização (RBAC)**
```typescript
enum Role {
  SUPER_ADMIN,      // Admin do SaaS
  ADMIN_EMPRESA,    // Admin da empresa cliente
  GESTOR,           // Gestor de equipe
  RH,               // Recursos Humanos
  FUNCIONARIO,      // Colaborador
  FINANCEIRO        // Acesso ao módulo financeiro
}
```

### **Proteções**
- HTTPS obrigatório (TLS)
- CORS configurado
- Rate limiting
- Validação de input (class-validator)
- SQL Injection protection (Prisma)
- XSS protection (sanitização)

### **Dados Sensíveis**
- Senhas: bcrypt hash
- Tokens: armazenamento seguro
- Fotos: MinIO com acesso restrito
- Dados pessoais: criptografia em trânsito

---

## 📈 Escalabilidade

### **Horizontal Scaling**
- Frontend: CDN + múltiplas instâncias Next.js
- Backend: Load balancer + múltiplas instâncias NestJS
- WebSocket: Redis Adapter para sync entre instâncias

### **Vertical Scaling**
- PostgreSQL: otimização de queries, índices
- Redis: configuração de memória
- MinIO: distributed mode

### **Otimizações**
- Cache agressivo (React Query)
- Lazy loading de componentes
- Imagens otimizadas (Next.js Image)
- Compressão de fotos antes de upload
- Batch de sincronização offline

---

## 🧪 Testes

### **Frontend**
- **Unit:** Jest + React Testing Library
- **E2E:** Playwright
- **PWA:** Lighthouse CI

### **Backend**
- **Unit:** Jest
- **Integration:** Supertest
- **E2E:** Jest + Prisma test DB

### **Offline**
- Simular desconexão de rede
- Testar sincronização com conflitos
- Validar cache e service worker

---

## 🚀 Deploy

### **Desenvolvimento**
```bash
docker-compose up -d
```

### **Produção**
- **Frontend:** Vercel ou AWS Amplify
- **Backend:** AWS ECS ou DigitalOcean App Platform
- **Banco:** AWS RDS ou DigitalOcean Managed DB
- **Storage:** AWS S3 ou MinIO cluster
- **Cache:** AWS ElastiCache ou Redis Cloud

---

**Última atualização:** 19/10/2025
