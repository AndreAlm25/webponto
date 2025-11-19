# ✅ Validação Pré-Migração - Revisão Necessária

**Data:** 20/10/2025  
**Status:** Aguardando aprovação para executar

---

## 🎯 O Que Será Feito

Vou executar a **Semana 1** do plano de migração com foco no componente facial.

---

## 📋 Checklist de Ações (Ordem de Execução)

### Dia 1-2: Infraestrutura CompreFace

#### ✅ O que vou fazer:
1. **Atualizar `docker-compose.yml`**
   - Adicionar 5 serviços do CompreFace
   - Configurar redes e volumes
   - Remover Traefik (simplificar para dev)

2. **Criar variáveis de ambiente**
   - Atualizar `.env.example` do backend
   - Adicionar config do CompreFace
   - Adicionar config do MinIO

3. **Testar stack**
   - `docker-compose up -d` para validar
   - Acessar CompreFace console
   - Criar API key

#### ❓ Preciso confirmar com você:
- [ ] Posso substituir o `docker-compose.yml` atual?
- [ ] Domínio para dev: usar `localhost` ou outro?

---

### Dia 3-4: Backend NestJS

#### ✅ O que vou fazer:
1. **Criar `ComprefaceService`**
   ```
   backend/src/common/compreface.service.ts
   ```
   - Integração com API do CompreFace
   - Cadastro de face
   - Reconhecimento 1:1 e 1:N
   - Threshold configurável

2. **Criar `MinioService`**
   ```
   backend/src/common/minio.service.ts
   ```
   - Upload de imagens
   - URLs públicas/assinadas
   - Gerenciamento de buckets

3. **Criar módulo `PontosModule`**
   ```
   backend/src/modules/pontos/
   ├── pontos.module.ts
   ├── pontos.controller.ts
   ├── pontos.service.ts
   └── dto/
       ├── registrar-ponto-facial.dto.ts
       └── cadastrar-face.dto.ts
   ```
   
4. **Endpoints:**
   - `POST /api/pontos/facial` - Reconhecimento + registro
   - `POST /api/pontos/facial/cadastro` - Cadastro de face
   - `GET /api/pontos/facial/status/:id` - Status do funcionário

5. **Atualizar Prisma Schema**
   - Adicionar campos `faceId` e `faceRegistrada` no modelo Funcionario
   - Rodar migration

#### ❓ Preciso confirmar com você:
- [ ] Posso criar os arquivos novos no backend?
- [ ] A estrutura de pastas está OK?

---

### Dia 5-6: Frontend Next.js

#### ✅ O que vou fazer:
1. **Copiar componentes do projeto antigo**
   ```
   /root/Apps/ponto/src/components/
   → /root/Apps/webponto/frontend/src/components/facial/
   
   Arquivos:
   - FacialRecognitionFlow.tsx
   - FacialRecognitionEnhanced.tsx
   - RoundButton.tsx
   - AvatarCircle.tsx
   - Background.tsx
   ```

2. **Instalar dependência**
   ```bash
   cd frontend
   npm install @mediapipe/tasks-vision
   ```

3. **Criar rota `/ponto/facial`**
   ```
   frontend/src/app/ponto/facial/page.tsx
   ```
   - Integração com os componentes
   - Callbacks para backend NestJS
   - Toast Sonner para notificações
   - Modo admin e employee

4. **Adaptações necessárias:**
   - Trocar endpoints de Next.js API Routes para NestJS
   - Ajustar autenticação (JWT do NestJS)
   - Integrar com IndexedDB para offline

#### ❓ Preciso confirmar com você:
- [ ] Posso criar a pasta `/ponto/facial/`?
- [ ] A rota `/ponto/facial` está OK ou prefere outro nome?

---

### Dia 7: Testes e Ajustes

#### ✅ O que vou fazer:
1. **Testar fluxo completo**
   - Cadastro de face
   - Reconhecimento
   - Liveness detection
   - Registro de ponto

2. **Validar integração**
   - CompreFace respondendo
   - MinIO armazenando
   - Backend registrando
   - Frontend notificando

3. **Criar script de teste**
   ```
   backend/scripts/test-facial.ts
   ```
   - Criar funcionário de teste
   - Cadastrar face
   - Simular reconhecimento

4. **Atualizar PROGRESSO.md**
   - Marcar tarefas concluídas ✅
   - Documentar problemas encontrados
   - Listar próximos passos

---

## 📊 Revisão do PROGRESSO.md Atual

Vou analisar o que já foi feito e precisa ser revisado:

### ✅ Já Concluído (revisar se precisa ajuste)
- [x] Estrutura base do projeto
- [x] docker-compose.yml básico
- [x] Prisma schema inicial
- [x] Frontend Next.js estruturado
- [x] Backend NestJS estruturado

### 🔄 Precisa Revisar/Refazer
- [ ] **docker-compose.yml** - Adicionar CompreFace (5 serviços)
- [ ] **Prisma schema** - Adicionar campos de reconhecimento facial
- [ ] **Backend** - Criar serviços (Compreface, MinIO, Pontos)
- [ ] **Frontend** - Adicionar componentes faciais

---

## ⚠️ Pontos de Atenção

### 1. Arquivos que Serão Modificados

#### Docker Compose
```yaml
# Arquivo: /root/Apps/webponto/docker-compose.yml
# Ação: SUBSTITUIR completamente
# Motivo: Adicionar 5 serviços do CompreFace
```

**Impacto:** ⚠️ ALTO - Todos os serviços serão reconfigurados

#### Prisma Schema
```prisma
// Arquivo: /root/Apps/webponto/backend/prisma/schema.prisma
// Ação: ADICIONAR campos
model Funcionario {
  // ... campos existentes
  faceId          String?   // ID no CompreFace
  faceRegistrada  Boolean @default(false)
}
```

**Impacto:** 🟡 MÉDIO - Precisa rodar migration

#### Package.json (Frontend)
```json
// Arquivo: /root/Apps/webponto/frontend/package.json
// Ação: ADICIONAR dependência
{
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.9"
  }
}
```

**Impacto:** 🟢 BAIXO - Apenas npm install

---

### 2. Arquivos Novos que Serão Criados

#### Backend
```
backend/src/
├── common/
│   ├── compreface.service.ts    [NOVO]
│   └── minio.service.ts         [NOVO]
└── modules/
    └── pontos/                   [NOVA PASTA]
        ├── pontos.module.ts
        ├── pontos.controller.ts
        ├── pontos.service.ts
        └── dto/
            ├── registrar-ponto-facial.dto.ts
            └── cadastrar-face.dto.ts
```

**Impacto:** 🟢 BAIXO - Arquivos novos, sem conflito

#### Frontend
```
frontend/src/
├── components/
│   └── facial/                   [NOVA PASTA]
│       ├── FacialRecognitionFlow.tsx
│       ├── FacialRecognitionEnhanced.tsx
│       ├── RoundButton.tsx
│       ├── AvatarCircle.tsx
│       └── Background.tsx
└── app/
    └── ponto/
        └── facial/               [NOVA PASTA]
            └── page.tsx
```

**Impacto:** 🟢 BAIXO - Arquivos novos, sem conflito

---

## 🚦 Status de Validação

### ✅ Pode Executar Sem Confirmação
- Criar arquivos novos (serviços, componentes)
- Instalar dependências npm
- Criar documentação

### ⚠️ Precisa de Confirmação
- Substituir `docker-compose.yml`
- Modificar Prisma schema (migration)
- Criar nova rota `/ponto/facial`

### ❌ NÃO Vou Fazer Sem Autorização
- Deletar arquivos existentes
- Modificar código já funcional
- Alterar estrutura de pastas principais

---

## 📝 Perguntas para Validação

### 1. Docker Compose
**Pergunta:** Posso substituir o `docker-compose.yml` atual para adicionar os 5 serviços do CompreFace?

**Alternativa:** Criar `docker-compose.compreface.yml` separado e rodar ambos?

### 2. Prisma Schema
**Pergunta:** Posso adicionar os campos `faceId` e `faceRegistrada` no modelo Funcionario e rodar a migration?

**Impacto:** Vai criar uma nova migration `add_facial_fields`

### 3. Rota Frontend
**Pergunta:** A rota `/ponto/facial` está OK ou prefere outro nome?

**Sugestões alternativas:**
- `/facial-recognition`
- `/reconhecimento-facial`
- `/ponto/camera`

### 4. Variáveis de Ambiente
**Pergunta:** Posso atualizar os arquivos `.env.example` com as novas variáveis do CompreFace e MinIO?

### 5. Ordem de Prioridade
**Pergunta:** A ordem proposta (Infra → Backend → Frontend → Testes) está OK ou quer ajustar?

---

## 🎯 Próximo Passo

**Aguardando sua aprovação para:**
1. ✅ Confirmar que posso executar as ações
2. ✅ Responder as perguntas de validação
3. ✅ Iniciar a execução do Plano de Ação Semana 1

**Ou**

- ❓ Você quer ajustar algo antes de começar?
- ❓ Tem alguma preocupação específica?
- ❓ Quer que eu explique melhor alguma parte?

---

**Status:** 🟡 Aguardando Validação  
**Próxima ação:** Executar Semana 1 após aprovação
