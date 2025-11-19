# WebPonto - Sistema de Ponto Eletrônico e Gestão Empresarial

Sistema completo de controle de ponto com reconhecimento facial, funcionamento offline/online e gestão empresarial integrada.

## 🚀 Quick Start

### **Gerenciador de Processos (Recomendado):**

```bash
cd /root/Apps/webponto

# Gerenciador interativo de processos
./manage-processes.sh
# ou simplesmente
./pm

# Funcionalidades:
# - Ver todos os processos ativos (Next.js, Nest.js, Prisma, Docker)
# - Matar processos específicos ou todos
# - Verificar portas em uso
# - Iniciar serviços individualmente ou todos
```

### **Modo Fácil (Scripts):**

```bash
cd /root/Apps/webponto/scripts

# Iniciar projeto
./iniciar.sh

# Ver logs
./ver-logs.sh

# Ver status
./status.sh

# Parar projeto
./parar.sh
```

### **Modo Manual:**

```bash
cd /root/Apps/webponto

# Iniciar
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down
```

### Acessar Aplicações

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **MinIO Console:** http://localhost:9001 (user: `minioadmin`, pass: `minioadmin123`)
- **CompreFace UI:** http://localhost:8081
- **CompreFace API:** http://localhost:8080
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## 📂 Estrutura do Projeto

```
webponto/
├── backend/              # NestJS API
├── frontend/             # Next.js + PWA
├── docs/                 # 📚 Toda documentação
│   ├── compreface/       # Docs do CompreFace
│   ├── erros/            # Correções aplicadas
│   ├── guias/            # Guias de uso
│   └── progresso/        # Histórico
├── scripts/              # Scripts utilitários
├── docker-compose.yml    # Config Docker
└── README.md
```

**📖 Documentação completa:** Veja `docs/ESTRUTURA_PROJETO.md`

## 🛠️ Tecnologias

- **Frontend:** Next.js 14, TailwindCSS, PWA
- **Backend:** NestJS, Prisma, Socket.IO
- **Infraestrutura:** PostgreSQL, Redis, MinIO, CompreFace
- **Deploy:** Docker + Docker Compose

## 🧪 Testes E2E

```bash
cd backend

# Rodar todos os testes E2E
npm run test:e2e

# Com coverage
npm run test:e2e -- --coverage

# Modo watch (roda ao salvar)
npm run test:e2e -- --watch

# Um arquivo específico
npm run test:e2e -- pontos.e2e-spec.ts
```

## 🛠️ Comandos Úteis

### Backend
```bash
cd backend

# Desenvolvimento
npm run start:dev          # Hot reload

# Prisma
npm run prisma:migrate     # Rodar migrations
npm run prisma:studio      # Interface visual do banco
npm run prisma:generate    # Gerar Prisma Client

# Testes
npm run test               # Testes unitários
npm run test:e2e          # Testes E2E
npm run test:cov          # Coverage
```

### Frontend
```bash
cd frontend

# Desenvolvimento
npm run dev               # Hot reload

# Build
npm run build             # Build de produção
npm run start             # Rodar build

# Linting
npm run lint              # ESLint
```

### Docker
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d     # Subir
docker-compose -f docker-compose.dev.yml down      # Parar
docker-compose -f docker-compose.dev.yml logs -f   # Logs

# Produção
docker-compose up -d      # Subir
docker-compose down       # Parar
docker-compose logs -f    # Logs

# Reconstruir imagens
docker-compose -f docker-compose.dev.yml build --no-cache
```

## 📖 Documentação

### Guias Principais
- **[README_MIGRACAO.md](./README_MIGRACAO.md)** - Status da migração
- **[COMO_TESTAR.md](./COMO_TESTAR.md)** - Como testar tudo
- **[PLANO_EXECUCAO_COMPLETO.md](./PLANO_EXECUCAO_COMPLETO.md)** - Plano completo de implementação

### Documentação Técnica
- **[docs/RECONHECIMENTO_FACIAL_DETALHADO.md](./docs/RECONHECIMENTO_FACIAL_DETALHADO.md)** - Sistema facial
- **[docs/COMPONENTE_FACIAL_GUIA.md](./docs/COMPONENTE_FACIAL_GUIA.md)** - Como usar componente
- **[docs/REGRAS_CLT_COMPLETO.md](./docs/REGRAS_CLT_COMPLETO.md)** - Base legal trabalhista
- **[docs/MINIO_SETUP_COMPLETO.md](./docs/MINIO_SETUP_COMPLETO.md)** - Storage S3

### Análises e Progresso
- **[ANALISE_PROJETO_ANTIGO.md](./ANALISE_PROJETO_ANTIGO.md)** - Análise completa
- **[PROGRESSO.md](./PROGRESSO.md)** - Status do projeto

## 👥 Módulos

- Landing Page (vendas)
- Painel Admin SaaS
- Gestão de Colaboradores
- Controle de Ponto (offline/online)
- Folha de Pagamento
- Financeiro
- Relatórios

## 📝 Licença

Proprietary - Todos os direitos reservados
