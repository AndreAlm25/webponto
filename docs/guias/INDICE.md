# 📚 Índice Geral - WebPonto

Bem-vindo ao projeto WebPonto! Este documento serve como guia de navegação para toda a documentação.

---

## 📁 Estrutura de Arquivos

```
/root/Apps/webponto/
│
├── 📄 README.md                    → Visão geral do projeto
├── 📄 DESENVOLVIMENTO.md           → Documentação completa de desenvolvimento
├── 📄 ARCHITECTURE.md              → Arquitetura detalhada do sistema
├── 📄 PROGRESSO.md                 → Acompanhamento do progresso
├── 📄 COMANDOS_UTEIS.md            → Comandos úteis para desenvolvimento
├── 📄 TEMA.md                      → Guia completo do sistema de temas dark/light
├── 📄 INDICE.md                    → Este arquivo
│
├── 🐳 docker-compose.yml           → Orquestração de containers
├── 📝 .gitignore                   → Arquivos ignorados pelo Git
│
├── 📂 backend/                     → API NestJS
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
└── 📂 frontend/                    → App Next.js
    ├── src/
    ├── public/
    ├── package.json
    ├── Dockerfile
    └── .env.local.example
```

---

## 📖 Guia de Leitura

### Para começar rapidamente
1. **[README.md](./README.md)** - Visão geral e quick start
2. **[COMANDOS_UTEIS.md](./COMANDOS_UTEIS.md)** - Comandos para rodar o projeto
3. **[TEMA.md](./TEMA.md)** - Como usar o sistema de temas dark/light

### Para entender o projeto
1. **[DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)** - Documentação técnica completa
   - Visão geral
   - Stack tecnológico
   - Módulos do sistema
   - Funcionamento offline/online
   - Modelagem de dados

2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitetura detalhada
   - Diagramas
   - Fluxos de dados
   - Camadas do sistema
   - Segurança
   - Escalabilidade

### Para acompanhar o desenvolvimento
1. **[PROGRESSO.md](./PROGRESSO.md)** - Status atual e próximos passos
   - O que já foi feito
   - O que está em desenvolvimento
   - Roadmap das próximas fases
   - Estatísticas

---

## 🎯 Acesso Rápido por Tópico

### Infraestrutura
- **Docker Compose:** [docker-compose.yml](./docker-compose.yml)
- **Comandos Docker:** [COMANDOS_UTEIS.md#Docker](./COMANDOS_UTEIS.md#docker)

### Backend (NestJS)
- **Estrutura:** [backend/](./backend/)
- **Schema Prisma:** [backend/prisma/schema.prisma](./backend/prisma/schema.prisma)
- **Main:** [backend/src/main.ts](./backend/src/main.ts)
- **Comandos:** [COMANDOS_UTEIS.md#Backend](./COMANDOS_UTEIS.md#backend-nestjs)

### Frontend (Next.js)
- **Estrutura:** [frontend/](./frontend/)
- **Layout:** [frontend/src/app/layout.tsx](./frontend/src/app/layout.tsx)
- **IndexedDB:** [frontend/src/lib/db.ts](./frontend/src/lib/db.ts)
- **PWA Manifest:** [frontend/public/manifest.json](./frontend/public/manifest.json)
- **Comandos:** [COMANDOS_UTEIS.md#Frontend](./COMANDOS_UTEIS.md#frontend-nextjs)

### Funcionalidades

#### Sistema de Ponto Offline
- **Conceito:** [DESENVOLVIMENTO.md#Funcionamento Offline/Online](./DESENVOLVIMENTO.md#-funcionamento-offlineonline)
- **Arquitetura:** [ARCHITECTURE.md#Fluxo de Sincronização](./ARCHITECTURE.md#-fluxo-de-sincronização-offline--online)
- **Implementação:** A ser desenvolvido na Fase 2

#### Autenticação
- **Segurança:** [ARCHITECTURE.md#Segurança](./ARCHITECTURE.md#-segurança)
- **Fluxo:** [ARCHITECTURE.md#Fluxo de Autenticação](./ARCHITECTURE.md#-fluxo-de-autenticação)
- **Implementação:** A ser desenvolvido na Fase 1

#### Reconhecimento Facial
- **CompreFace:** [COMANDOS_UTEIS.md#CompreFace](./COMANDOS_UTEIS.md#compreface)
- **Integração:** [DESENVOLVIMENTO.md#Reconhecimento Facial](./DESENVOLVIMENTO.md)
- **Implementação:** A ser desenvolvido na Fase 2

#### RH e Folha de Pagamento
- **Modelagem:** [DESENVOLVIMENTO.md#Modelagem de Dados](./DESENVOLVIMENTO.md#-modelagem-de-dados)
- **Cálculos:** [DESENVOLVIMENTO.md#Folha de Pagamento](./DESENVOLVIMENTO.md)
- **Implementação:** A ser desenvolvido na Fase 3

#### Módulo Financeiro
- **Fluxo de Caixa:** [DESENVOLVIMENTO.md#Financeiro](./DESENVOLVIMENTO.md)
- **Implementação:** A ser desenvolvido na Fase 4

---

## 🚀 Quick Start

```bash
# 1. Navegar até o projeto
cd /root/Apps/webponto

# 2. Subir infraestrutura
docker-compose up -d postgres redis minio compreface

# 3. Backend (terminal 1)
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev

# 4. Frontend (terminal 2)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

**Acessar:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000/api

---

## 📊 Status do Projeto

**Progresso Geral:** 15%  
**Fase Atual:** Estrutura Base ✅  
**Próxima Fase:** Autenticação (Fase 1)

Ver detalhes em: [PROGRESSO.md](./PROGRESSO.md)

---

## 🔍 Buscar Informação

### Por Tecnologia
- **Next.js:** [frontend/](./frontend/), [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
- **NestJS:** [backend/](./backend/), [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
- **Prisma:** [backend/prisma/](./backend/prisma/), [COMANDOS_UTEIS.md](./COMANDOS_UTEIS.md)
- **Docker:** [docker-compose.yml](./docker-compose.yml), [COMANDOS_UTEIS.md](./COMANDOS_UTEIS.md)
- **PWA:** [frontend/next.config.js](./frontend/next.config.js), [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
- **IndexedDB:** [frontend/src/lib/db.ts](./frontend/src/lib/db.ts), [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Socket.IO:** [ARCHITECTURE.md](./ARCHITECTURE.md), [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)

### Por Funcionalidade
- **Login/Autenticação:** [ARCHITECTURE.md#Autenticação](./ARCHITECTURE.md), [PROGRESSO.md#Fase 1](./PROGRESSO.md)
- **Batida de Ponto:** [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md), [PROGRESSO.md#Fase 2](./PROGRESSO.md)
- **Offline/Sincronização:** [ARCHITECTURE.md](./ARCHITECTURE.md), [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
- **Reconhecimento Facial:** [COMANDOS_UTEIS.md](./COMANDOS_UTEIS.md), [PROGRESSO.md#Fase 2](./PROGRESSO.md)
- **Folha de Pagamento:** [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md), [PROGRESSO.md#Fase 3](./PROGRESSO.md)
- **Financeiro:** [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md), [PROGRESSO.md#Fase 4](./PROGRESSO.md)

---

## 📞 Informações Importantes

### Credenciais Padrão (Desenvolvimento)

**PostgreSQL:**
- Host: localhost:5432
- User: webponto
- Password: webponto123
- Database: webponto_db

**MinIO:**
- Console: http://localhost:9001
- User: minioadmin
- Password: minioadmin123

**CompreFace:**
- URL: http://localhost:8000
- Admin Password: admin123

**Redis:**
- Host: localhost:6379
- Password: (sem senha)

---

## 🎓 Convenções do Projeto

### Commits
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` alteração em documentação
- `chore:` tarefas gerais (config, deps)
- `refactor:` refatoração de código
- `test:` adição/modificação de testes

### Branches
- `main` - produção
- `develop` - desenvolvimento
- `feature/*` - novas funcionalidades
- `fix/*` - correções

---

## 🤝 Contribuindo

1. Ler toda a documentação em [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
2. Verificar o progresso em [PROGRESSO.md](./PROGRESSO.md)
3. Seguir as convenções de código
4. Criar testes quando aplicável
5. Atualizar documentação se necessário

---

## 📚 Recursos Externos

### Documentação Oficial
- [Next.js](https://nextjs.org/docs)
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Dexie (IndexedDB)](https://dexie.org/)
- [Socket.IO](https://socket.io/docs/)

### APIs Integradas
- [CompreFace](https://github.com/exadel-inc/CompreFace)
- [MinIO](https://min.io/docs/)

---

**Última atualização:** 19/10/2025  
**Próxima revisão:** Após conclusão da Fase 1
