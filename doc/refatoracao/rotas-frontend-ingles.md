# 🔄 REFATORAÇÃO: Rotas do Frontend em Inglês

## 📋 PROBLEMA:
Algumas rotas do frontend estão em **INGLÊS**, violando o padrão do projeto que define:
- **Frontend:** Rotas em PORTUGUÊS (para usuários brasileiros)
- **Backend:** Rotas em INGLÊS (padrão REST API)

---

## 🔍 ROTAS EM INGLÊS ENCONTRADAS:

### **1. `/admin/[company]/overtime`**
- **Atual:** `/admin/acme-tech/overtime`
- **Deveria ser:** `/admin/acme-tech/hora-extra`
- **Arquivos:**
  - `/frontend/src/app/admin/[company]/overtime/page.tsx`
  - Referências na sidebar

### **2. `/admin/[company]/geofences`**
- **Atual:** `/admin/acme-tech/geofences`
- **Deveria ser:** `/admin/acme-tech/cercas-geograficas`
- **Arquivos:**
  - `/frontend/src/app/admin/[company]/geofences/page.tsx`
  - `/frontend/src/app/admin/[company]/geofences/[id]/edit/page.tsx`
  - `/frontend/src/app/admin/[company]/funcionarios/[id]/geofence/page.tsx`
  - `/frontend/src/app/admin/[company]/funcionarios/geofence-lote/page.tsx`
  - Referências na sidebar

---

## ✅ ROTAS JÁ CORRETAS (EM PORTUGUÊS):

- ✅ `/admin/[company]/funcionarios` - Funcionários
- ✅ `/admin/[company]/cargos` - Cargos
- ✅ `/admin/[company]/departamentos` - Departamentos
- ✅ `/admin/[company]/alertas` - Alertas
- ✅ `/admin/[company]/mensagens` - Mensagens
- ✅ `/admin/[company]/configuracoes` - Configurações
- ✅ `/admin/[company]/dashboard-conformidade` - Dashboard CLT

---

## 🔧 REFATORAÇÃO NECESSÁRIA:

### **PASSO 1: Renomear pastas**
```bash
# Overtime
mv /frontend/src/app/admin/[company]/overtime \
   /frontend/src/app/admin/[company]/hora-extra

# Geofences
mv /frontend/src/app/admin/[company]/geofences \
   /frontend/src/app/admin/[company]/cercas-geograficas
```

### **PASSO 2: Atualizar rotas na Sidebar**
```tsx
// AdminSidebar.tsx

// ANTES:
router.push(`${base}/overtime`)
router.push(`${base}/geofences`)

// DEPOIS:
router.push(`${base}/hora-extra`)
router.push(`${base}/cercas-geograficas`)
```

### **PASSO 3: Atualizar links internos**
Buscar e substituir em todos os arquivos:
- `href="/admin/[company]/overtime"` → `href="/admin/[company]/hora-extra"`
- `href="/admin/[company]/geofences"` → `href="/admin/[company]/cercas-geograficas"`
- `router.push(\`\${base}/overtime\`)` → `router.push(\`\${base}/hora-extra\`)`
- `router.push(\`\${base}/geofences\`)` → `router.push(\`\${base}/cercas-geograficas\`)`

### **PASSO 4: Atualizar breadcrumbs**
```tsx
// ANTES:
breadcrumbs={[
  { label: 'Admin', href: base },
  { label: 'Geofences' }  // ❌ Inglês
]}

// DEPOIS:
breadcrumbs={[
  { label: 'Admin', href: base },
  { label: 'Cercas Geográficas' }  // ✅ Português
]}
```

---

## 📊 IMPACTO DA REFATORAÇÃO:

### **Arquivos a modificar:**
1. **Pastas (renomear):**
   - `/overtime/` → `/hora-extra/`
   - `/geofences/` → `/cercas-geograficas/`
   - `/funcionarios/[id]/geofence/` → `/funcionarios/[id]/cerca-geografica/`
   - `/funcionarios/geofence-lote/` → `/funcionarios/cerca-geografica-lote/`

2. **Componentes (atualizar rotas):**
   - `AdminSidebar.tsx`
   - Todos os `page.tsx` que linkam para essas rotas
   - Breadcrumbs
   - Botões de navegação

3. **Backend (NÃO MEXER):**
   - ✅ `/api/overtime` - Mantém em inglês
   - ✅ `/api/geofences` - Mantém em inglês
   - ✅ Apenas frontend muda

### **Benefícios:**
- ✅ Consistência com padrão do projeto
- ✅ Melhor UX para usuários brasileiros
- ✅ URLs mais intuitivas
- ✅ Facilita SEO (se aplicável)

### **Riscos:**
- ⚠️ Quebra de links salvos/favoritos dos usuários
- ⚠️ Necessário atualizar toda documentação
- ⚠️ Possíveis links hardcoded esquecidos

---

## 🎯 PRIORIDADE:
**MÉDIA** - Não é crítico, mas deve ser feito antes do deploy em produção para evitar quebrar links de usuários.

---

## ✅ CHECKLIST DE REFATORAÇÃO:

- [ ] Renomear pasta `/overtime/` → `/hora-extra/`
- [ ] Renomear pasta `/geofences/` → `/cercas-geograficas/`
- [ ] Renomear subpastas relacionadas a geofence
- [ ] Atualizar `AdminSidebar.tsx`
- [ ] Buscar e substituir todas as referências
- [ ] Testar navegação completa
- [ ] Verificar breadcrumbs
- [ ] Atualizar documentação
- [ ] Testar em produção (staging)

---

## 📝 COMANDO DE BUSCA:

```bash
# Buscar todas as referências a overtime e geofences
grep -r "overtime\|geofences" frontend/src --include="*.tsx" --include="*.ts"

# Buscar rotas hardcoded
grep -r "/admin/.*/(overtime|geofences)" frontend/src --include="*.tsx"
```

---

**Data:** 24/11/2025  
**Status:** PENDENTE  
**Responsável:** A definir
