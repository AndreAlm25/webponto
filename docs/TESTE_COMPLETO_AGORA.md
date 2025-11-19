# 🧪 TESTE COMPLETO - PASSO A PASSO

**Data:** 20/10/2025 20:50  
**Status:** ✅ Frontend REBUILD completo (imagem nova)

---

## ✅ SISTEMA PRONTO PARA TESTAR!

```
✅ Frontend: RECONSTRUÍDO (sem cache)
✅ Backend: Rodando
✅ CompreFace: Rodando
✅ PostgreSQL: Rodando
✅ Hot Reload: ATIVO em ambos
```

---

## 🎯 TESTE PASSO A PASSO (SIGA EXATAMENTE)

### **PASSO 1: ABRIR NAVEGADOR**

```
http://localhost:3000
```

**✅ Deve aparecer:** Página inicial do WebPonto

---

### **PASSO 2: ABRIR CONSOLE DO NAVEGADOR**

**Como:**
1. Pressione `F12` (ou clique direito → Inspecionar)
2. Vá na aba **Console**
3. Cole e execute:

```javascript
// LIMPAR DADOS ANTIGOS
localStorage.clear()
sessionStorage.clear()
console.log('✅ Dados limpos! Recarregando...')
location.reload()
```

**✅ Deve:** Recarregar a página com dados zerados

---

### **PASSO 3: FAZER LOGIN**

**Credenciais:**
```
Email: joao.silva@empresateste.com.br
Senha: senha123
```

**✅ Deve:** Ir para Dashboard

---

### **PASSO 4: ABRIR RECONHECIMENTO FACIAL**

1. No Dashboard, clique: **"Registrar Ponto"**
2. **✅ Deve:** Abrir página `/ponto/facial`

---

### **PASSO 5: CADASTRAR FACE (PRIMEIRA VEZ)**

1. Clique: **"Iniciar Câmera"**
2. Permita acesso à câmera
3. Posicione seu rosto
4. Aguarde captura automática (~2-3 segundos)

**✅ Deve aparecer:** 
- "Face cadastrada com sucesso!"
- Notificação verde (Toast Sonner)

**📊 NO CONSOLE (F12) DEVE APARECER:**
```
[REGISTER] Cadastrando face...
[face-test/add] ✅ Face cadastrada com sucesso
```

---

### **PASSO 6: PRIMEIRA BATIDA DE PONTO (ENTRADA)**

1. Volte para `/ponto/facial` (ou recarregue)
2. **✅ Agora deve ter 2 botões:**
   - [ ] Cadastro
   - [ ] Reconhecimento ← **CLIQUE AQUI**
3. Clique: **"Iniciar Câmera"**
4. Posicione seu rosto
5. Aguarde reconhecimento

**✅ DEVE ACONTECER:**
```
1. Reconhecimento bem-sucedido
2. Sistema decide: ENTRADA (primeira vez)
3. Registra ponto automaticamente
4. Mensagem: "Entrada registrada com sucesso!"
5. Fecha câmera
6. Volta para Dashboard
```

**📊 NO CONSOLE (F12) DEVE APARECER:**
```
[RECOGNIZE] 📊 Pontos de hoje: { lastType: null, total: 0 }
[RECOGNIZE] Decidindo ação: CLOCK_IN
[TIMECLOCK] 💾 Ponto salvo no localStorage: {...}
```

**🔍 VERIFICAR NO CONSOLE:**
```javascript
// Cole e execute:
const pontos = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
console.table(pontos)
// Deve mostrar 1 registro: CLOCK_IN
```

---

### **PASSO 7: SEGUNDA BATIDA (AMBIGUIDADE!)**

1. **IMPORTANTE:** Espere uns 10 segundos (simular tempo real)
2. Vá para `/ponto/facial` novamente
3. Clique modo: **"Reconhecimento"**
4. Clique: **"Iniciar Câmera"**
5. Posicione rosto

**✅ DEVE ACONTECER:**

**Se estiver próximo de 12:00 ou 18:00:**
```
→ Decisão AUTOMÁTICA (sem ambiguidade)
→ Exemplo: 12:05 → INÍCIO_INTERVALO
→ Exemplo: 18:05 → SAÍDA
```

**Se NÃO estiver próximo (ex: 15:00):**
```
→ AMBIGUIDADE! 
→ Deve aparecer 2 BOTÕES:
   [☕ Início do Intervalo]
   [🏠 Saída]
→ ESCOLHA UM!
```

**📊 NO CONSOLE (F12) DEVE APARECER:**
```
[RECOGNIZE] 📊 Pontos de hoje: { lastType: 'CLOCK_IN', total: 1 }
[RECOGNIZE] Última foi ENTRADA, verificando horários...
[RECOGNIZE] ⚠️ AMBÍGUO! Não está próximo de horários específicos
```

**🔍 SE AMBIGUIDADE APARECEU:**
```
✅ FUNCIONANDO CORRETAMENTE!
✅ Sistema está INTELIGENTE!
✅ Escolha uma opção e prossiga
```

---

### **PASSO 8: TERCEIRA BATIDA (DEPENDE DA ESCOLHA)**

**Se escolheu INÍCIO_INTERVALO:**
```
→ Próxima batida: FIM_INTERVALO (automático)
→ Não tem ambiguidade
```

**Se escolheu SAÍDA:**
```
→ Próxima batida: ENTRADA (novo ciclo)
→ Volta ao começo
```

---

## 🎯 FLUXO COMPLETO ESPERADO

### **Cenário 1: Dia Normal (com intervalo)**
```
08:05 → ENTRADA (automático)
       localStorage: [CLOCK_IN]

12:05 → INÍCIO_INTERVALO (automático - próximo de 12:00)
       localStorage: [CLOCK_IN, BREAK_START]

13:05 → FIM_INTERVALO (automático)
       localStorage: [CLOCK_IN, BREAK_START, BREAK_END]

18:05 → SAÍDA (automático - próximo de 18:00)
       localStorage: [CLOCK_IN, BREAK_START, BREAK_END, CLOCK_OUT]
```

### **Cenário 2: Saída Antecipada (15:00)**
```
08:00 → ENTRADA
15:00 → AMBÍGUO!
        Escolhe: SAÍDA
       localStorage: [CLOCK_IN, CLOCK_OUT]
```

### **Cenário 3: Sem Intervalo**
```
08:00 → ENTRADA
18:00 → SAÍDA (automático)
       localStorage: [CLOCK_IN, CLOCK_OUT]
```

---

## 🐛 PROBLEMAS ESPERADOS E SOLUÇÕES

### **1. "Ambiguidade não aparece"**

**Causa:** Horário atual está próximo de 12:00 ou 18:00

**Solução:** Teste em horário intermediário (ex: 15:00)

**OU altere horários do funcionário:**
```sql
-- Via Prisma Studio (http://localhost:5555)
-- Tabela: funcionarios
-- Edite o funcionário ID=2:
horarioInicioIntervalo: "23:00" (horário impossível)
horarioFimIntervalo: "23:30" (horário impossível)
```

Assim nunca estará "próximo" e sempre será ambíguo!

---

### **2. "Ponto só registra ENTRADA sempre"**

**Verifique console (F12):**
```javascript
// Deve salvar no localStorage após cada batida
const pontos = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
console.log('Total de pontos:', pontos.length)
console.table(pontos)
```

**Se não aparecer pontos:**
```
❌ PROBLEMA: localStorage não está sendo salvo
🔧 SOLUÇÃO: Veja logs do console para erros
```

**Logs esperados:**
```
[TIMECLOCK] 💾 Ponto salvo no localStorage: {...}
```

---

### **3. "Câmera não abre"**

**Soluções:**
1. Permitir câmera no navegador
2. Usar `localhost` (não IP)
3. Fechar outros apps usando câmera

---

### **4. "Erro: Funcionário não encontrado"**

**Verifique:**
```sql
-- Via Prisma Studio
SELECT * FROM funcionarios WHERE id = 2;

-- Deve ter:
- faceRegistrada = true
- empresaId = 2
```

---

## 📊 COMO VERIFICAR SE ESTÁ FUNCIONANDO

### **1. Console do Navegador (F12):**
```javascript
// Verificar pontos salvos
const pontos = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
console.log('📊 Total de pontos:', pontos.length)
console.table(pontos)

// Último tipo
const ultimo = pontos[pontos.length - 1]
console.log('🕐 Último ponto:', ultimo?.type)
```

**Resultado esperado:**
```
📊 Total de pontos: 2
🕐 Último ponto: BREAK_START
┌─────────┬──────────────┬──────────────────┬────────────┐
│ (index) │ type         │ timestamp        │ employeeId │
├─────────┼──────────────┼──────────────────┼────────────┤
│    0    │ 'CLOCK_IN'   │ '2025-10-20...'  │     2      │
│    1    │ 'BREAK_START'│ '2025-10-20...'  │     2      │
└─────────┴──────────────┴──────────────────┴────────────┘
```

---

### **2. Logs do Frontend:**
```bash
# Em outro terminal
docker compose logs frontend -f | grep -E "TIMECLOCK|RECOGNIZE"
```

**Deve mostrar:**
```
[RECOGNIZE] 📊 Pontos de hoje: {...}
[TIMECLOCK] 💾 Ponto salvo no localStorage: {...}
```

---

## ✅ CHECKLIST DE SUCESSO

Marque cada item após testar:

- [ ] Login funcionou
- [ ] Cadastro de face funcionou
- [ ] Primeira batida: ENTRADA registrada
- [ ] localStorage salvou (visto no console)
- [ ] Segunda batida: Ambiguidade APARECEU
- [ ] Escolheu opção: Ponto registrado
- [ ] Terceira batida: Próximo tipo correto
- [ ] Sequência completa: ENTRADA → INTERVALO → SAÍDA

**Se TODOS marcados:**
```
🎊 PARABÉNS! SISTEMA 100% FUNCIONAL! 🚀
```

**Se algum falhou:**
1. Veja logs no console (F12)
2. Veja logs do Docker: `docker compose logs frontend -f`
3. Copie erros e compartilhe

---

## 🚀 PRÓXIMOS PASSOS (APÓS CONFIRMAR QUE FUNCIONA)

### **FASE 2: Backend Real**
- Substituir localStorage por PostgreSQL
- Persistência permanente
- Histórico completo

### **FASE 3: Dashboard**
- Visualizar pontos do dia
- Horas trabalhadas
- Relatórios

---

## 💡 DICAS IMPORTANTES

### **1. Limpar dados entre testes:**
```javascript
// No console (F12)
localStorage.clear()
location.reload()
```

### **2. Simular meia-noite (resetar pontos):**
```javascript
// No console
localStorage.removeItem('pontos_hoje')
console.log('✅ Pontos resetados!')
```

### **3. Verificar horário do servidor:**
```bash
docker compose exec backend date
```

---

## 📞 AINDA NÃO FUNCIONA?

**Colete essas informações:**

1. **Console do navegador (F12):**
   - Copie TODOS os logs
   - Copie TODOS os erros (em vermelho)

2. **Resultado do localStorage:**
   ```javascript
   console.log(localStorage.getItem('pontos_hoje'))
   ```

3. **Logs do Docker:**
   ```bash
   docker compose logs frontend --tail=100
   ```

4. **Status do sistema:**
   ```bash
   docker compose ps
   ```

---

**🎊 REBUILD COMPLETO FEITO! TUDO NOVO! TESTE AGORA! 🚀**

**Horário atual do teste:** 20:50 (20/10/2025)
**Próximo horário de ambiguidade:** 21:00-23:00 ou 03:00-11:00
**Melhor horário para testar:** Agora! (longe de 12:00 e 18:00)
