# 🎯 PLANO DE AÇÃO - Finalizar Fase 1

**Data:** 20/10/2025
**Status:** 🟡 Em Andamento (80% completo)

---

## ✅ O Que JÁ FOI FEITO

1. ✅ Infraestrutura Docker completa (10 serviços)
2. ✅ Frontend compilando sem erros
3. ✅ Backend respondendo
4. ✅ CompreFace configurado
5. ✅ Banco de dados PostgreSQL + Prisma
6. ✅ MinIO para armazenamento
7. ✅ Documentação organizada em pastas
8. ✅ Scripts organizados em `/scripts`
9. ✅ CompreFace FE funcionando (porta 8000)

---

## 🔧 O QUE FALTA FAZER

### 1. Padronizar Nomenclatura (URGENTE)

**Problema:** Rotas misturando inglês e português

**Ação:**
```bash
# Renomear rota
/app/ponto/facial/page.tsx  ✅ (já está em português)

# CRIAR novas rotas padronizadas:
/app/ponto/cadastro/page.tsx     (cadastro de face)
/app/ponto/historico/page.tsx    (histórico de pontos)
/app/ponto/relatorio/page.tsx    (relatórios - admin)
```

**Componentes:**
```
✅ /components/facial/FacialRecognitionFlow.tsx
✅ /components/facial/FacialRecognitionEnhanced.tsx
✅ /components/facial/AvatarCircle.tsx
✅ /components/facial/Background.tsx
✅ /components/facial/Backgroun### Prioridade ALTA:

1. **Padronizar Nomes de Rotas**
   - [x] Padrão definido (português)
   - [ ] Renomear rotas restantes
   - [ ] Atualizar imports e referências
   - [ ] Documentar padrão de nomenclatura

2. **Implementar Auto-Detecção de Rosto** ✅ **CONCLUÍDO!**
   - [x] Copiar lógica do projeto antigo
   - [x] Integrar MediaPipe completo
   - [x] Testar detecção em tempo real
   - [x] Feedback visual implementado
   - [x] Auto-captura funcionando automaticamente

**Referência:** `/root/Apps/ponto/src/app/facial-recognition-enhanced/page.tsx`

**Ação:**

### 2. Implementar Auto-Detecção de Rosto

**Problema:** Câmera abre mas não detecta rosto automaticamente

**Referência:** `/root/Apps/ponto/src/app/facial-recognition-enhanced/page.tsx`

**Ação:**

#### 2.1. Copiar Lógica do Projeto Antigo
```typescript
// De: /root/Apps/ponto
// Para: /root/Apps/webponto/frontend/src/lib/mediapiperFaceDetection.ts

✅ Já criado (placeholder)
🔧 IMPLEMENTAR lógica completa:
   - FaceDetector do MediaPipe
   - isWellPositioned()
   - Detecção em tempo real
```

#### 2.2. Integrar no Componente
```typescript
// Em: FacialRecognitionEnhanced.tsx

🔧 TODO:
1. Importar getMediaPipeFaceDetection
2. Usar em useEffect para detecção contínua
3. Mostrar feedback visual (círculo verde/vermelho)
4. Auto-capturar quando bem posicionado
```

**Resultado Esperado:**
- Rosto detectado automaticamente
- Feedback visual em tempo real
- Captura automática quando bem posicionado

---

### 3. Completar Registro de Ponto

**Problema:** Reconhece, mas não registra o ponto no banco

**Ação:**

#### 3.1. Verificar Endpoint do Backend
```bash
# Endpoint deve existir:
POST /pontos/facial

# Payload:
{
  "funcionarioId": "uuid",
  "foto": "base64",
  "tipo": "ENTRADA" | "SAIDA" | "INTERVALO"
}
```

#### 3.2. Frontend: Chamar API Após Reconhecimento
```typescript
// Em: FacialRecognitionFlow.tsx

const handleRecognitionSuccess = async (result: any) => {
  try {
    // 1. Pegar resultado do CompreFace
    const { funcionarioId, similarity } = result
    
    // 2. Registrar ponto
    const response = await fetch('/api/pontos/facial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        funcionarioId,
        foto: capturedImage,
        tipo: determinarTipoPonto() // ENTRADA/SAIDA/INTERVALO
      })
    })
    
    // 3. Mostrar confirmação
    if (response.ok) {
      toast.success('Ponto registrado com sucesso!')
      showConfirmation(result)
    }
  } catch (error) {
    toast.error('Erro ao registrar ponto')
  }
}
```

#### 3.3. Backend: Processar e Salvar
```typescript
// Backend já tem:
// ✅ POST /pontos/facial
// ✅ PontosService.registrarPontoFacial()

// Verificar se está:
// 1. Reconhecendo no CompreFace
// 2. Salvando no banco (Prisma)
// 3. Retornando sucesso
```

**Resultado Esperado:**
- Ponto salvo no banco de dados
- Confirmação visual para usuário
- Histórico acessível

---

### 4. Implementar Lógica de Tipo de Ponto

**Problema:** Não determina se é ENTRADA, SAÍDA ou INTERVALO

**Ação:**

```typescript
// Nova função: determinarTipoPonto()

function determinarTipoPonto(funcionarioId: string): Promise<TipoPonto> {
  // 1. Buscar último ponto do funcionário
  const ultimoPonto = await fetch(`/api/pontos/${funcionarioId}/ultimo`)
  
  // 2. Lógica:
  if (!ultimoPonto) return 'ENTRADA'
  
  if (ultimoPonto.tipo === 'ENTRADA') {
    // Perguntar: Saída para Intervalo ou Saída Final?
    return await mostrarDialogoEscolha([
      'INTERVALO_INICIO',
      'SAIDA'
    ])
  }
  
  if (ultimoPonto.tipo === 'INTERVALO_INICIO') {
    return 'INTERVALO_FIM'
  }
  
  if (ultimoPonto.tipo === 'INTERVALO_FIM') {
    return 'SAIDA'
  }
  
  return 'ENTRADA' // Novo dia
}
```

**Resultado Esperado:**
- Sistema pergunta quando ambíguo
- Fluxo correto: ENTRADA → INTERVALO_INICIO → INTERVALO_FIM → SAIDA
- Novo dia começa com ENTRADA

---

## 📅 Cronograma

### Semana 1 (Atual):
- [x] Organizar documentação
- [x] Organizar scripts
- [ ] Padronizar nomenclatura
- [ ] Implementar auto-detecção (50%)

### Semana 2:
- [ ] Completar auto-detecção
- [ ] Implementar registro de ponto completo
- [ ] Implementar lógica de tipo de ponto
- [ ] Testes E2E

### Semana 3:
- [ ] Refatoração e otimização
- [ ] Documentação final
- [ ] Deploy de testes

---

## 🎯 Critérios de Conclusão da Fase 1

Para considerar a Fase 1 **100% CONCLUÍDA**:

1. ✅ Infraestrutura rodando sem erros
2. ✅ Frontend compilando
3. ✅ Backend respondendo
4. ✅ CompreFace configurado
5. ⏳ **Auto-detecção de rosto funcionando**
6. ⏳ **Registro de ponto salvando no banco**
7. ⏳ **Lógica de tipo de ponto implementada**
8. ⏳ **Nomenclatura 100% padronizada**
9. ⏳ **Testes E2E passando**
10. ⏳ **Documentação atualizada**

**Status Atual: 60% → Meta: 100%**

---

## 🚦 Semáforo do Projeto

| Área | Status | % |
|------|--------|---|
| Infraestrutura | 🟢 Completa | 100% |
| Frontend Build | 🟢 Funcionando | 100% |
| Backend API | 🟢 Funcionando | 100% |
| CompreFace | 🟢 Configurado | 100% |
| Auto-Detecção | 🟡 Parcial | 30% |
| Registro Ponto | 🟡 Parcial | 40% |
| Tipo de Ponto | 🔴 Não Iniciado | 0% |
| Nomenclatura | 🟡 Parcial | 70% |
| Testes E2E | 🟡 Criados | 50% |
| Documentação | 🟢 Organizada | 90% |

**MÉDIA GERAL: 68%** 🟡

---

## 💡 Decisões Importantes

### 1. Padrão de Nomenclatura: PORTUGUÊS
**Decisão:** Todas as rotas, funções públicas e documentação em português
**Razão:** Projeto brasileiro, equipe fala português, mais natural

### 2. Estrutura de Pastas: ORGANIZADA
**Decisão:** `/docs` para documentação, `/scripts` para scripts
**Razão:** Raiz limpa, fácil de ignorar no Git, profissional

### 3. Fluxo de Ponto: COMPLETO
**Decisão:** ENTRADA → INTERVALO_INICIO → INTERVALO_FIM → SAIDA
**Razão:** Segue legislação trabalhista brasileira

### 4. Auto-Detecção: OBRIGATÓRIA
**Decisão:** Sempre detectar rosto antes de permitir captura
**Razão:** Melhor UX, evita fotos ruins, mais profissional

---

## 🎓 Aprendizados

### O Que Funcionou Bem:
1. ✅ Organização em fases
2. ✅ Documentação desde o início
3. ✅ Docker Compose para desenvolvimento
4. ✅ Você questionando e melhorando! 👏

### O Que Precisa Melhorar:
1. 🔧 Planejamento mais detalhado antes de implementar
2. 🔧 Testes desde o início (TDD)
3. 🔧 Commits mais frequentes e descritivos
4. 🔧 Revisão de código mais rigorosa

---

## 📞 Próxima Reunião de Status

**Data:** A definir
**Pauta:**
1. Revisar progresso deste plano
2. Decidir prioridades da semana
3. Resolver bloqueios
4. Planejar Fase 2

---

**👨‍💻 Vamos com tudo finalizar a Fase 1!** 🚀
