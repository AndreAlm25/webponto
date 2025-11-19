# 🧪 TESTE DIRETO NO NAVEGADOR - DIAGNÓSTICO

**IMPORTANTE:** Faça EXATAMENTE esses passos e me mostre o resultado!

---

## PASSO 1: ABRIR CONSOLE

1. Abra: http://localhost:3000
2. Pressione `F12`
3. Vá na aba **Console**

---

## PASSO 2: LIMPAR TUDO

Cole e execute no console:

```javascript
localStorage.clear()
sessionStorage.clear()
console.log('✅ Limpo!')
location.reload()
```

---

## PASSO 3: FAZER LOGIN

```
Email: joao.silva@empresateste.com.br
Senha: senha123
```

---

## PASSO 4: TESTE MANUAL (SEM RECONHECIMENTO FACIAL)

Cole e execute no console:

```javascript
// SIMULAR PRIMEIRA BATIDA DE PONTO
console.log('🧪 TESTE 1: Primeira batida (ENTRADA)')

// Simular que bateu ponto
const ponto1 = {
  id: Date.now(),
  employeeId: 2,
  type: 'CLOCK_IN',
  method: 'FACIAL_RECOGNITION',
  timestamp: new Date().toISOString(),
  message: 'Entrada registrada'
}

// Salvar no localStorage
localStorage.setItem('pontos_hoje', JSON.stringify([ponto1]))

// Verificar se salvou
const salvos = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
console.log('📊 Pontos salvos:', salvos.length)
console.table(salvos)

// Verificar último tipo
const ultimo = salvos[salvos.length - 1]
console.log('🕐 Último tipo:', ultimo?.type)
```

**❓ O QUE APARECEU?**
- Deve mostrar: `📊 Pontos salvos: 1`
- Deve mostrar tabela com 1 linha (CLOCK_IN)

---

## PASSO 5: SIMULAR SEGUNDA BATIDA

Cole e execute no console:

```javascript
console.log('🧪 TESTE 2: Segunda batida (deve ser AMBÍGUO)')

// Buscar pontos anteriores
const pontosAnteriores = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
const lastType = pontosAnteriores.length > 0 ? pontosAnteriores[pontosAnteriores.length - 1].type : null

console.log('📊 Último tipo:', lastType)

// Verificar horário atual
const now = new Date()
const hora = now.getHours()
const minuto = now.getMinutes()
console.log('🕐 Horário atual:', `${hora}:${minuto}`)

// Função para verificar proximidade
function isNearTime(targetTime, toleranceMinutes = 30) {
  if (!targetTime) return false
  const [hours, minutes] = targetTime.split(':').map(Number)
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)
  const diffMinutes = Math.abs((now.getTime() - target.getTime()) / 60000)
  return diffMinutes <= toleranceMinutes
}

// Verificar decisão
if (lastType === 'CLOCK_IN') {
  const proximoIntervalo = isNearTime('12:00')
  const proximoSaida = isNearTime('18:00')
  
  console.log('🔍 Próximo de 12:00?', proximoIntervalo)
  console.log('🔍 Próximo de 18:00?', proximoSaida)
  
  if (proximoIntervalo) {
    console.log('✅ DECISÃO: INÍCIO_INTERVALO (automático)')
  } else if (proximoSaida) {
    console.log('✅ DECISÃO: SAÍDA (automático)')
  } else {
    console.log('⚠️ DECISÃO: AMBÍGUO! Deve mostrar botões!')
    console.log('   Opções: [INÍCIO_INTERVALO] ou [SAÍDA]')
  }
} else {
  console.log('❌ ERRO: lastType não é CLOCK_IN!')
  console.log('   lastType:', lastType)
}
```

**❓ O QUE APARECEU?**

Copie e cole aqui EXATAMENTE o que apareceu!

---

## PASSO 6: AGORA TESTE COM RECONHECIMENTO FACIAL

1. Vá para: Dashboard → "Registrar Ponto"
2. Modo: **Reconhecimento**
3. Iniciar câmera
4. Reconhecer rosto

**ENQUANTO RECONHECE, OLHE O CONSOLE (F12)!**

**❓ O QUE APARECEU NO CONSOLE?**

Procure por:
- `[RECOGNIZE] 📊 Pontos de hoje:`
- `[TIMECLOCK] 💾 Ponto salvo no localStorage:`
- `[RECOGNIZE] ⚠️ AMBÍGUO!`

**COPIE E COLE AQUI!**

---

## PASSO 7: VERIFICAR SE SALVOU APÓS RECONHECIMENTO

Cole no console:

```javascript
const pontos = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
console.log('📊 Total de pontos:', pontos.length)
console.table(pontos)
```

**❓ QUANTOS PONTOS APARECERAM?**
- Se 0: ❌ NÃO SALVOU!
- Se 1: ⚠️ Salvou só o primeiro
- Se 2+: ✅ SALVOU!

---

## 🎯 ME MOSTRE OS RESULTADOS!

**Copie e cole aqui:**

1. Resultado do PASSO 4 (primeira batida manual)
2. Resultado do PASSO 5 (decisão)
3. Resultado do PASSO 6 (logs do reconhecimento)
4. Resultado do PASSO 7 (quantos pontos salvou)

**Com essas informações vou saber EXATAMENTE onde está o problema!**

---

## 🔍 POSSÍVEIS PROBLEMAS:

### **A) localStorage não salva:**
```
Causa: Navegador bloqueando
Solução: Usar outro navegador ou permitir cookies
```

### **B) Código não executa:**
```
Causa: Erro JavaScript antes de salvar
Solução: Ver erros no console (vermelho)
```

### **C) Lógica não decide corretamente:**
```
Causa: Bug na condição
Solução: Ajustar código
```

---

**🚨 FAÇA ESSES TESTES E ME MOSTRE OS RESULTADOS! 🚨**
