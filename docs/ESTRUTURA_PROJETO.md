# 📂 ESTRUTURA DO PROJETO WEBPONTO

## 🎯 Organização das Pastas

```
/root/Apps/webponto/
├── backend/              # API NestJS
├── frontend/             # Next.js 14
├── docs/                 # 📚 TODA A DOCUMENTAÇÃO
│   ├── compreface/       # Documentação do CompreFace
│   ├── erros/            # Correções e erros resolvidos
│   ├── guias/            # Guias de uso e desenvolvimento
│   └── progresso/        # Histórico de desenvolvimento
├── scripts/              # Scripts utilitários
│   ├── iniciar.sh        # Iniciar projeto
│   ├── parar.sh          # Parar projeto
│   ├── status.sh         # Ver status
│   └── ver-logs.sh       # Ver logs
├── docker-compose.yml    # Configuração Docker
└── README.md             # Documento principal
```

---

## 📚 DOCUMENTAÇÃO

### **docs/guias/**
- `TESTES-COMPLETOS.md` - Checklist completo de testes
- `COMANDOS_UTEIS.md` - Comandos úteis do projeto
- `COMO_TESTAR.md` - Como testar funcionalidades
- `ARCHITECTURE.md` - Arquitetura do sistema
- `DESENVOLVIMENTO.md` - Guia de desenvolvimento

### **docs/compreface/**
- `COMPREFACE_CONFIGURADO.md` - Como configurar CompreFace
- `COMPREFACE_SETUP.md` - Setup inicial
- `COMO_ACESSAR_COMPREFACE.md` - Como acessar

### **docs/erros/**
- Documentos com correções aplicadas
- Histórico de erros resolvidos

### **docs/progresso/**
- Fases do desenvolvimento
- Implementações realizadas
- Migrações executadas

---

## 🚀 COMEÇANDO

### **1. Iniciar o projeto:**
```bash
cd /root/Apps/webponto/scripts
./iniciar.sh
```

### **2. Ver logs:**
```bash
./ver-logs.sh
```

### **3. Acessar:**
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **Prisma Studio:** http://localhost:5555
- **CompreFace:** http://localhost:8000

---

## 📖 DOCUMENTAÇÃO PRINCIPAL

Para informações detalhadas, consulte:
- `README.md` - Visão geral do projeto
- `docs/guias/TESTES-COMPLETOS.md` - Como testar tudo
- `docs/guias/COMANDOS_UTEIS.md` - Comandos úteis

---

**Última atualização:** 20/10/2025
