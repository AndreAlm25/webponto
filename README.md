# WebPonto - Sistema de Ponto Eletrônico e Gestão Empresarial

Sistema completo de controle de ponto com reconhecimento facial, funcionamento offline/online e gestão empresarial integrada.

## 📖 Documentação Completa

**Toda a documentação está unificada em:** [DOCUMENTACAO-PRINCIPAL.md](./DOCUMENTACAO-PRINCIPAL.md)

## 🚀 Quick Start

### **Gerenciador de Processos (Recomendado):**

```bash
cd /root/Apps/webponto

# Gerenciador interativo de processos
./manage-processes.sh
# ou simplesmente
./pm
```

### **Modo Fácil (Scripts):**

```bash
cd /root/Apps/webponto/scripts

./iniciar.sh    # Iniciar projeto
./ver-logs.sh   # Ver logs
./status.sh     # Ver status
./parar.sh      # Parar projeto
```

### **Modo Manual:**

```bash
cd /root/Apps/webponto

docker compose up -d      # Iniciar
docker compose logs -f    # Ver logs
docker compose down       # Parar
```

### Acessar Aplicações

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Backend API | http://localhost:4000 | - |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin123` |
| CompreFace UI | http://localhost:8081 | - |

## 📂 Estrutura do Projeto

```
webponto/
├── backend/                    # NestJS API
├── frontend/                   # Next.js + PWA
├── scripts/                    # Scripts utilitários
├── docker-compose.yml          # Config Docker
├── DOCUMENTACAO-PRINCIPAL.md   # 📚 Documentação completa
└── README.md
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

## 📝 Licença

Proprietary - Todos os direitos reservados
