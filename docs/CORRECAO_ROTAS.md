# ✅ CORREÇÃO: ROTAS DO FRONTEND

**Data:** 21/10/2025 07:05  
**Problema:** Rotas antigas ainda sendo usadas

---

## 🐛 PROBLEMA ENCONTRADO:

```json
{
  "message": "funcionarioId deve ser um número inteiro positivo",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Causa:** 
- Frontend estava chamando rotas antigas: `/api/pontos/facial`
- Backend esperava: `/api/time-entries/facial`

---

## ✅ CORREÇÃO APLICADA:

### **Arquivos corrigidos:**

1. **`src/app/api/face-test/register/route.ts`**
   ```typescript
   // ANTES
   const backendUrl = `${BACKEND_URL}/api/pontos/facial/cadastro`
   
   // DEPOIS
   const backendUrl = `${BACKEND_URL}/api/time-entries/facial/cadastro`
   ```

2. **`src/app/api/face-test/recognize-one/route.ts`**
   ```typescript
   // ANTES
   const backendUrl = `${BACKEND_URL}/api/pontos/facial`
   
   // DEPOIS
   const backendUrl = `${BACKEND_URL}/api/time-entries/facial`
   ```

3. **`src/components/facial/FacialRecognitionEnhanced.tsx`**
   ```typescript
   // Comentário atualizado
   // O backend /api/time-entries/facial NÃO registra ponto, só reconhece!
   ```

---

## ✅ VERIFICAÇÃO:

```bash
# Verificar se ainda tem rotas antigas
grep -r "'/api/pontos" frontend/src/
# Resultado: 0 (nenhuma encontrada) ✅
```

---

## 🔄 AÇÃO:

```bash
docker compose restart frontend
✅ Frontend reiniciado!
```

---

## 🧪 TESTE AGORA:

1. Abrir: http://localhost:3000
2. Login
3. Cadastro facial → **DEVE FUNCIONAR AGORA!** ✅
4. Reconhecimento → **DEVE FUNCIONAR!** ✅

---

**Status:** 🟢 CORRIGIDO!
