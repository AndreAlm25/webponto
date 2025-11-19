# 🔧 PLANO DE ARRUMAÇÃO COMPLETA DO WEBPONTO

**Data:** 21/10/2025 19:05  
**Status:** 🔴 EM ANDAMENTO

---

## 📋 PROBLEMAS IDENTIFICADOS:

### **1. MODO DEMO ATIVO ❌**
- Frontend está usando dados mockados
- Login funciona com tokens fake (`demo-token-`)
- Cadastro facial salva no localStorage
- **SOLUÇÃO:** Remover TUDO relacionado a demo

### **2. VARIÁVEIS HARDCODED ❌**
- `http://localhost:4000` em vários lugares
- `http://backend:4000` hardcoded
- **SOLUÇÃO:** Usar `process.env` sempre

### **3. SCHEMA PRISMA INCOMPLETO ❌**
- Falta `avatarUrl` no Employee (foto de perfil)
- Projeto antigo tem campos que o novo não tem
- **SOLUÇÃO:** Atualizar schema

### **4. CORS BLOQUEANDO ❌**
- Navegador bloqueia requisições cross-origin
- **SOLUÇÃO:** API Routes do Next.js (JÁ IMPLEMENTADO)

### **5. COMENTÁRIOS EM INGLÊS ❌**
- Backend tem comentários em inglês
- Usuário não entende inglês
- **SOLUÇÃO:** Comentários em português

---

## 🎯 PLANO DE AÇÃO:

### **ETAPA 1: SCHEMA PRISMA** ✅

**Campos a adicionar no Employee:**
```prisma
model Employee {
  // ... campos existentes ...
  
  // Foto de perfil (diferente da foto facial)
  avatarUrl String?
  
  // Foto facial (já existe como photoUrl)
  photoUrl String?
  faceId String?
  faceRegistered Boolean @default(false)
}
```

**Diferença:**
- `avatarUrl`: Foto de perfil do funcionário (upload manual)
- `photoUrl`: Foto capturada para reconhecimento facial

---

### **ETAPA 2: REMOVER MODO DEMO** ❌

**Arquivos a modificar:**

1. **contexts/AuthContext.tsx**
   - ❌ Remover tokens `demo-token-`
   - ❌ Remover usuários mockados
   - ✅ Usar SEMPRE `/api/auth/login` real

2. **app/dashboard/page.tsx**
   - ❌ Remover banner "MODO DEMO ATIVO"
   - ✅ Mostrar dados reais do PostgreSQL

3. **app/login/page.tsx**
   - ❌ Remover "MODO DEMO ATIVO - Funciona offline"
   - ✅ Remover fallback para modo offline

4. **app/ponto/facial/page.tsx**
   - ❌ Remover localStorage de faces registradas
   - ✅ Usar API `/api/time-entries/facial/status` real

---

### **ETAPA 3: VARIÁVEIS DE AMBIENTE** ❌

**Arquivos a corrigir:**

1. **frontend/src/app/api/time-entries/facial/cadastro/route.ts**
   ```typescript
   // ❌ ANTES
   const backendUrl = 'http://backend:4000'
   
   // ✅ DEPOIS
   const backendUrl = process.env.BACKEND_URL || 'http://backend:4000'
   ```

2. **Criar .env no frontend:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   BACKEND_URL=http://backend:4000  # Para API Routes (servidor)
   ```

3. **Criar .env no backend:**
   ```env
   DATABASE_URL=postgresql://...
   COMPREFACE_API_URL=http://compreface-api:8080
   MINIO_ENDPOINT=minio
   PORT=4000
   CORS_ORIGIN=http://localhost:3000
   ```

---

### **ETAPA 4: COMENTÁRIOS EM PORTUGUÊS** ❌

**Backend - Padrão:**
```typescript
// ✅ Comentário em português explicando o código
export class TimeEntriesService {
  /**
   * Registrar ponto com reconhecimento facial
   * @param imageBuffer - Buffer da imagem capturada
   * @param companyId - ID da empresa
   */
  async registrarPontoFacial(imageBuffer: Buffer, companyId: number) {
    // Reconhecer rosto usando CompreFace
    const result = await this.compreface.recognize(imageBuffer)
    
    // Salvar ponto no banco de dados
    return await this.prisma.timeEntry.create({...})
  }
}
```

---

### **ETAPA 5: AUTENTICAÇÃO REAL** ❌

**Fluxo correto:**
```
1. Login → POST /api/auth/login
2. Backend valida credenciais no PostgreSQL
3. Backend retorna JWT token
4. Frontend salva token
5. Frontend usa token em todas as requisições
```

**Sem modo demo, sem fallback, sem localStorage fake!**

---

### **ETAPA 6: CADASTRO FACIAL REAL** ❌

**Fluxo correto:**
```
1. Frontend captura foto
2. POST /api/time-entries/facial/cadastro
3. Next.js API Route → Backend
4. Backend → CompreFace (cadastra face)
5. Backend → MinIO (salva foto)
6. Backend → PostgreSQL (atualiza employee)
7. Retorna sucesso
```

**Sem localStorage, sem simulação, tudo real!**

---

## 📊 CHECKLIST:

### **Schema Prisma:**
- [ ] Adicionar avatarUrl no Employee
- [ ] Migrar banco de dados
- [ ] Testar campos novos

### **Remover Demo:**
- [ ] AuthContext: remover tokens demo
- [ ] AuthContext: remover usuários mockados
- [ ] Dashboard: remover banner demo
- [ ] Login: remover badge demo
- [ ] Ponto Facial: remover localStorage

### **Variáveis de Ambiente:**
- [ ] Criar BACKEND_URL no .env
- [ ] Atualizar API Routes
- [ ] Testar em desenvolvimento
- [ ] Documentar para produção

### **Comentários:**
- [ ] Backend: converter para português
- [ ] Frontend: já está em português

### **Testar:**
- [ ] Login real funciona
- [ ] Cadastro facial funciona
- [ ] Reconhecimento facial funciona
- [ ] Dados persistem no PostgreSQL

---

## 🚀 ORDEM DE EXECUÇÃO:

1. ✅ Schema Prisma (15 min)
2. ✅ Remover Demo (30 min)
3. ✅ Variáveis de Ambiente (15 min)
4. ✅ Comentários Backend (20 min)
5. ✅ Testar Autenticação (10 min)
6. ✅ Testar Cadastro Facial (10 min)
7. ✅ Documentar (10 min)

**TOTAL:** ~2 horas de trabalho focado

---

**🎯 OBJETIVO:** Sistema funcionando 100% com banco de dados real, sem modo demo, pronto para produção!
