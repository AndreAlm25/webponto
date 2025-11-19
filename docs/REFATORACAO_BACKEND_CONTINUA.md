# 🔄 REFATORAÇÃO BACKEND - CONTINUAÇÃO

**Status:** 🟡 EM ANDAMENTO

---

## ✅ FEITO ATÉ AGORA:

1. ✅ Schema Prisma refatorado
2. ✅ Banco de dados migrado
3. ✅ Diretório renomeado: `pontos` → `time-entries`
4. ✅ Arquivos renomeados:
   - `pontos.controller.ts` → `time-entries.controller.ts`
   - `pontos.service.ts` → `time-entries.service.ts`
   - `pontos.module.ts` → `time-entries.module.ts`

---

## 🔄 PRÓXIMO PASSO:

Atualizar conteúdo dos arquivos do backend.

**Arquivos a atualizar:**

### **1. time-entries.controller.ts**
- Renomear classe: `PontosController` → `TimeEntriesController`
- Renomear rota: `@Controller('pontos')` → `@Controller('time-entries')`
- Atualizar imports
- Atualizar variáveis: `empresaId` → `companyId`, `funcionarioId` → `employeeId`
- Atualizar comentários (manter em português)

### **2. time-entries.service.ts**
- Renomear classe: `PontosService` → `TimeEntriesService`
- Atualizar queries Prisma: `prisma.ponto` → `prisma.timeEntry`
- Atualizar variáveis: `empresaId` → `companyId`, `funcionarioId` → `employeeId`
- Atualizar enums: `TipoPonto` → `TimeEntryType`

### **3. time-entries.module.ts**
- Renomear classe: `PontosModule` → `TimeEntriesModule`
- Atualizar imports

### **4. DTOs (dto/)**
- Renomear arquivos e classes
- Atualizar propriedades

### **5. app.module.ts**
- Atualizar import: `PontosModule` → `TimeEntriesModule`

### **6. auth.service.ts**
- Atualizar queries Prisma
- Atualizar variáveis

### **7. seed.service.ts**
- Atualizar queries Prisma
- Atualizar variáveis

---

## 📝 PADRÃO DE REFATORAÇÃO:

```typescript
// ANTES
empresaId → companyId
funcionarioId → employeeId
prisma.empresa → prisma.company
prisma.usuario → prisma.user
prisma.funcionario → prisma.employee
prisma.ponto → prisma.timeEntry
TipoPonto → TimeEntryType
StatusPonto → TimeEntryStatus
```

---

## ⏱️ TEMPO ESTIMADO:

- Atualizar controllers/services: 45min
- Atualizar DTOs: 15min
- Atualizar app.module: 5min
- Testar: 15min
- **TOTAL:** ~1h20min

---

**Próximo:** Atualizar time-entries.controller.ts
