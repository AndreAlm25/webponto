# 🛠️ Comandos Úteis - WebPonto

## Docker

### Iniciar todos os serviços
```bash
docker-compose up -d
```

### Iniciar apenas infraestrutura (sem app)
```bash
docker-compose up -d postgres redis minio compreface
```

### Ver logs
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Parar tudo
```bash
docker-compose down
```

### Parar e remover volumes (⚠️ apaga dados)
```bash
docker-compose down -v
```

### Rebuild de um serviço
```bash
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

---

## Backend (NestJS)

### Instalar dependências
```bash
cd backend
npm install
```

### Rodar em desenvolvimento
```bash
npm run start:dev
```

### Build para produção
```bash
npm run build
npm run start:prod
```

### Prisma

#### Gerar client
```bash
npx prisma generate
```

#### Criar migration
```bash
npx prisma migrate dev --name nome_da_migration
```

#### Aplicar migrations em produção
```bash
npx prisma migrate deploy
```

#### Abrir Prisma Studio
```bash
npx prisma studio
```

#### Reset do banco (⚠️ apaga dados)
```bash
npx prisma migrate reset
```

#### Seed (popular banco)
```bash
npx prisma db seed
```

### Testes
```bash
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

### Lint
```bash
npm run lint
npm run format
```

---

## Frontend (Next.js)

### Instalar dependências
```bash
cd frontend
npm install
```

### Rodar em desenvolvimento
```bash
npm run dev
```

### Build para produção
```bash
npm run build
npm run start
```

### Lint
```bash
npm run lint
```

---

## Prisma Úteis

### Ver SQL de uma migration
```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

### Forçar sincronização do schema (desenvolvimento)
```bash
npx prisma db push
```

---

## MinIO

### Acessar console
- URL: http://localhost:9001
- User: minioadmin
- Pass: minioadmin123

### Criar bucket via CLI (mc)
```bash
docker exec -it webponto_minio sh
mc alias set local http://localhost:9000 minioadmin minioadmin123
mc mb local/pontos
mc mb local/funcionarios
```

---

## CompreFace

### Acessar
- URL: http://localhost:8000
- Admin pass: admin123

### Criar API Key via curl
```bash
curl -X POST http://localhost:8000/api/v1/recognition/subjects \
  -H "x-api-key: 00000000-0000-0000-0000-000000000002" \
  -H "Content-Type: application/json" \
  -d '{"subject": "funcionario_123"}'
```

---

## Redis

### Conectar via CLI
```bash
docker exec -it webponto_redis redis-cli
```

### Comandos úteis Redis
```redis
KEYS *
GET chave
DEL chave
FLUSHALL  # ⚠️ Limpa tudo
```

---

## PostgreSQL

### Conectar via psql
```bash
docker exec -it webponto_postgres psql -U webponto -d webponto_db
```

### Comandos úteis PostgreSQL
```sql
\dt              -- Listar tabelas
\d+ tabela       -- Ver estrutura
SELECT * FROM usuarios;
\q               -- Sair
```

### Backup
```bash
docker exec webponto_postgres pg_dump -U webponto webponto_db > backup.sql
```

### Restore
```bash
docker exec -i webponto_postgres psql -U webponto webponto_db < backup.sql
```

---

## Git

### Primeiro commit
```bash
git init
git add .
git commit -m "feat: estrutura inicial do projeto"
```

### Ignorar node_modules já commitados
```bash
git rm -r --cached node_modules
git commit -m "chore: remove node_modules"
```

---

## Desenvolvimento

### Criar novo módulo NestJS
```bash
cd backend
nest g module modules/nome
nest g controller modules/nome
nest g service modules/nome
```

### Criar novo componente Next.js
```bash
cd frontend/src/components
mkdir nome-componente
touch nome-componente/index.tsx
```

---

## Troubleshooting

### Porta já em uso
```bash
# Ver processo na porta
lsof -i :3000
lsof -i :4000

# Matar processo
kill -9 <PID>
```

### Limpar cache do Next
```bash
cd frontend
rm -rf .next
npm run dev
```

### Problemas com Prisma Client
```bash
cd backend
rm -rf node_modules/.prisma
npx prisma generate
```

### Docker com problemas
```bash
# Limpar tudo
docker system prune -a --volumes

# Rebuild do zero
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## Monitoramento

### Ver uso de recursos Docker
```bash
docker stats
```

### Ver espaço em disco
```bash
docker system df
```

### Ver logs em tempo real
```bash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm run dev

# Ou via Docker
docker-compose logs -f --tail=100
```

---

## Produção

### Build completo
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build

# Docker
docker-compose -f docker-compose.prod.yml up -d --build
```

### Variáveis de ambiente
```bash
# Backend
cp .env.example .env.production

# Frontend
cp .env.local.example .env.production
```

---

## Aliases Úteis (adicionar ao ~/.bashrc ou ~/.zshrc)

```bash
# WebPonto
alias wp='cd /root/Apps/webponto'
alias wpb='cd /root/Apps/webponto/backend'
alias wpf='cd /root/Apps/webponto/frontend'
alias wplogs='docker-compose logs -f'
alias wpup='docker-compose up -d'
alias wpdown='docker-compose down'
alias wprestart='docker-compose restart'
```
