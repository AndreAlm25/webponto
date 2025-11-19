# 🔍 GUIA: PROVA DE VIDA (LIVENESS)

## **O QUE É PROVA DE VIDA?**

A prova de vida (liveness) é uma validação que garante que a pessoa está **realmente presente** na frente da câmera, e não é uma foto, vídeo ou máscara.

---

## **📊 COMO FUNCIONA NO WEBPONTO?**

O sistema analisa **4 critérios** em tempo real:

### **1. Piscar (Blink Detection) - 25 pontos**
- ✅ **Detectado:** Rosto fica estável por 15+ frames (~0.5 segundos)
- ❌ **Não detectado:** Rosto muito instável ou movimento rápido
- **Como passar:** Fique parado olhando para a câmera por 1 segundo

### **2. Movimento (Movement Detection) - 25 pontos**
- ✅ **Detectado:** Movimento suave da cabeça (20+ pixels)
- ❌ **Não detectado:** Rosto completamente parado ou movimento muito rápido
- **Como passar:** Mova a cabeça levemente (esquerda/direita ou cima/baixo)

### **3. Estabilidade (Face Stable) - 25 pontos**
- ✅ **Detectado:** Rosto relativamente parado (variância < 40)
- ❌ **Não detectado:** Rosto muito instável ou tremendo
- **Como passar:** Mantenha a cabeça relativamente parada (sem tremer)

### **4. Qualidade (Quality Good) - 25 pontos**
- ✅ **Detectado:** Rosto grande na tela (50%+) e boa confiança (70%+)
- ❌ **Não detectado:** Rosto muito pequeno ou mal iluminado
- **Como passar:** Aproxime o rosto da câmera e melhore a iluminação

---

## **✅ VALIDAÇÃO FINAL:**

```
Score = blinkDetected (25) + movementDetected (25) + faceStable (25) + qualityGood (25)

✅ VÁLIDO: Score >= 50 (2+ critérios atendidos)
❌ INVÁLIDO: Score < 50 (menos de 2 critérios)
```

---

## **🧪 COMO TESTAR:**

### **1. Abra o Console do Navegador:**
- Chrome: F12 → Console
- Firefox: F12 → Console

### **2. Abra a Câmera Facial:**
- Entre no painel do funcionário
- Clique em "Reconhecimento Facial"

### **3. Veja os Logs em Tempo Real:**
```
[LIVENESS] 📊 Status: {
  blinkDetected: false,      ← Precisa ficar parado
  movementDetected: false,   ← Precisa mover a cabeça
  faceStable: true,          ← OK!
  qualityGood: true,         ← OK!
  stableFrames: 8,           ← Precisa chegar a 15+
  movementScore: 5,          ← Precisa chegar a 20+
  stabilityScore: 85,        ← OK! (60+)
  qualityScore: 75,          ← OK! (50+)
  confidenceScore: 92        ← OK! (70+)
}
```

### **4. Siga as Instruções:**

**Passo 1:** Fique parado olhando para a câmera por 1 segundo
- ✅ `blinkDetected: true` (stableFrames >= 15)

**Passo 2:** Mova a cabeça levemente (esquerda/direita)
- ✅ `movementDetected: true` (movementScore >= 20)

**Passo 3:** Volte a ficar parado
- ✅ `faceStable: true` (stabilityScore >= 60)

**Passo 4:** Aproxime o rosto e melhore a iluminação
- ✅ `qualityGood: true` (qualityScore >= 50 e confidenceScore >= 70)

### **5. Quando Enviar:**
```
[LIVENESS] 📤 Enviando para backend: {
  livenessScore: 75,         ← 3 critérios = 75 pontos
  livenessValid: true,       ← >= 50 = VÁLIDO ✅
  detalhes: { ... }
}
```

---

## **❌ ERROS COMUNS:**

### **1. "Prova de vida obrigatória"**
- **Causa:** Score < 50 (menos de 2 critérios)
- **Solução:** Siga os 4 passos acima

### **2. "blinkDetected: false"**
- **Causa:** Rosto muito instável ou movimento rápido
- **Solução:** Fique PARADO por 1 segundo completo

### **3. "movementDetected: false"**
- **Causa:** Rosto completamente parado (movementScore < 20)
- **Solução:** Mova a cabeça LEVEMENTE (não precisa muito)

### **4. "faceStable: false"**
- **Causa:** Rosto tremendo ou muito instável (stabilityScore < 60)
- **Solução:** Segure a cabeça mais firme

### **5. "qualityGood: false"**
- **Causa:** Rosto muito pequeno ou mal iluminado
- **Solução:** Aproxime o rosto e melhore a luz

---

## **🎯 DICAS PARA PASSAR:**

1. **Iluminação:** Use luz natural ou lâmpada na frente
2. **Distância:** Rosto deve ocupar 50%+ da tela
3. **Movimento:** Leve e suave (não brusco)
4. **Estabilidade:** Segure a cabeça firme (sem tremer)
5. **Tempo:** Aguarde 2-3 segundos antes de tentar

---

## **🔧 AJUSTAR SENSIBILIDADE:**

Se quiser facilitar a validação, edite:
`/root/Apps/webponto/frontend/src/components/facial/FacialRecognitionEnhanced.tsx`

```typescript
// Linha 524-527
const newLiveness = {
  blinkDetected: stableFrames > 10,      // Era 15, agora 10 (mais fácil)
  movementDetected: movementScore > 15,  // Era 20, agora 15 (mais fácil)
  faceStable: stabilityScore > 50,       // Era 60, agora 50 (mais fácil)
  qualityGood: qualityScore > 40 && confidenceScore > 60  // Mais fácil
}

// Linha 629
const valid = score >= 50  // Manter 50 (2+ critérios)
```

---

## **📝 RESUMO:**

**Para passar na prova de vida:**
1. ✅ Fique parado por 1 segundo
2. ✅ Mova a cabeça levemente
3. ✅ Volte a ficar parado
4. ✅ Aproxime o rosto e melhore a luz
5. ✅ Aguarde 2-3 segundos
6. ✅ Clique para bater ponto

**Score mínimo:** 50 pontos (2+ critérios)
**Score máximo:** 100 pontos (4 critérios)
