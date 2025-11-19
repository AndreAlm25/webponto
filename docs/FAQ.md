# ❓ FAQ - Perguntas Frequentes

**Última atualização:** 20/10/2025

---

## 🤔 SOBRE O SISTEMA

### **1. O que é o WebPonto?**
Sistema completo de ponto eletrônico com reconhecimento facial, desenvolvido com Next.js (frontend) e NestJS (backend).

### **2. Quais tecnologias usa?**
- **Frontend:** Next.js 14, React, TailwindCSS
- **Backend:** NestJS, Prisma ORM
- **Banco:** PostgreSQL
- **Reconhecimento Facial:** CompreFace
- **Infraestrutura:** Docker

---

## 🔴 MODO DEMO - O QUE É?

### **"Modo DEMO ativo" - O que significa?**

**IMPORTANTE:** Não existe "modo demo" no código do WebPonto!

Se você está vendo "MODO DEMO" ou algo similar, pode ser:

#### **1. Aviso do Navegador (Câmera/Microfone)**
```
Quando você permite acesso à câmera, navegadores mostram:
┌──────────────────────────────────────┐
│ 🔴 example.com está usando sua câmera │
└──────────────────────────────────────┘
```

**Solução:** Normal! É o navegador informando que a câmera está ativa.

#### **2. Mensagem de Console (Desenvolvimento)**
```
No console do navegador (F12) podem aparecer:
[DEMO] ...
[TEST] ...
[DEV] ...
```

**Solução:** São logs de desenvolvimento. Não afeta o funcionamento.

#### **3. Extensão do Navegador**
Alguma extensão instalada pode estar mostrando avisos.

**Solução:** Teste em aba anônima (Ctrl+Shift+N) sem extensões.

#### **4. Para Verificar:**
```javascript
// Abra o console (F12) e cole:
console.log('DEMO?', localStorage.getItem('demo'))
console.log('Modo:', localStorage.getItem('mode'))
console.log('Todas as keys:', Object.keys(localStorage))
```

Se não aparecer nada relacionado a "demo", **não é do nosso sistema**.

---

## 🐛 PROBLEMAS COMUNS

### **1. "Ponto só registra ENTRADA sempre"**

**Causa:** Sistema estava salvando no servidor (não funciona).

**Solução:** ✅ JÁ CORRIGIDO! (20/10/2025)

**Como funciona agora:**
```
1ª vez: ENTRADA
2ª vez: AMBIGUIDADE ou AUTOMÁTICO
3ª vez: Depende da sequência
```

**Limpar dados antigos:**
```javascript
// No console (F12)
localStorage.clear()
location.reload()
```

### **2. "Câmera não funciona"**

**Possíveis causas:**

#### **A) HTTP em vez de HTTPS**
```
❌ http://192.168.1.100:3000 (câmera bloqueada)
✅ http://localhost:3000 (funciona)
✅ https://seudominio.com (funciona)
```

**Solução:** Use `localhost` ou configure HTTPS.

#### **B) Permissão negada**
```
Navegador pediu permissão e você negou.
```

**Solução:** 
1. Clique no ícone 🔒 (cadeado) na barra de endereço
2. Permitir câmera
3. Recarregue a página

#### **C) Câmera em uso**
```
Outro app/aba está usando a câmera.
```

**Solução:** Feche outros apps que usam câmera.

### **3. "Ambiguidade não aparece"**

**Causa:** Horários configurados fazem decisão automática.

**Exemplo:**
```
Horário intervalo: 12:00
Hora atual: 12:15 (próximo!)
Resultado: INÍCIO_INTERVALO automático (sem ambiguidade)
```

**Quando aparece ambiguidade:**
```
Última: ENTRADA (08:00)
Hora atual: 15:00
Não está próximo de 12:00 (intervalo)
Não está próximo de 18:00 (saída)
→ AMBÍGUO! Mostra escolha
```

**Para testar:**
Bata ponto em horário intermediário (ex: 15:00).

### **4. "Login não funciona"**

**Credenciais padrão:**
```
Email: joao.silva@empresateste.com.br
Senha: senha123
```

**Se não funcionar:**
1. Verifique se backend está rodando:
   ```bash
   docker compose ps
   # backend deve estar "Up"
   ```

2. Veja logs:
   ```bash
   docker compose logs backend
   ```

3. Verifique banco de dados:
   ```bash
   docker compose exec postgres psql -U webponto -d webponto_db -c "SELECT * FROM usuarios;"
   ```

---

## 🔧 DESENVOLVIMENTO

### **1. Como rodar o projeto?**
```bash
cd /root/Apps/webponto/scripts
./iniciar.sh
```

### **2. Como ver logs?**
```bash
./ver-logs.sh
```

### **3. Como parar o projeto?**
```bash
./parar.sh
```

### **4. Como acessar o banco?**
```bash
# Via Prisma Studio
http://localhost:5555

# Via psql
docker compose exec postgres psql -U webponto -d webponto_db
```

### **5. Como limpar dados de teste?**
```sql
-- Limpar pontos
DELETE FROM pontos;

-- Limpar funcionários (cuidado!)
DELETE FROM funcionarios WHERE id > 1;

-- Resetar sequências
ALTER SEQUENCE pontos_id_seq RESTART WITH 1;
```

### **6. Como adicionar funcionário?**
```sql
INSERT INTO funcionarios (
  "empresaId", 
  matricula, 
  nome, 
  cpf, 
  "dataAdmissao", 
  "salarioBase",
  "horarioEntrada",
  "horarioSaida",
  "horarioInicioIntervalo",
  "horarioFimIntervalo"
) VALUES (
  2,
  'FUNC002',
  'Maria Santos',
  '98765432100',
  '2024-01-15',
  3500.00,
  '08:00',
  '18:00',
  '12:00',
  '13:00'
);
```

---

## 📊 DADOS E PERSISTÊNCIA

### **1. Onde os pontos são salvos?**

**Atualmente (FASE 1):**
```
localStorage do navegador (temporário)
```

**Em breve (FASE 2):**
```
Banco PostgreSQL (permanente)
```

### **2. Os dados são perdidos ao fechar o navegador?**

**FASE 1 (atual):**
```
NÃO! localStorage persiste entre sessões.
Só é limpo:
- Se limpar localStorage manualmente
- Se limpar dados do navegador
- À meia-noite (reset automático)
```

**FASE 2 (próxima):**
```
NÃO! Salvos no banco PostgreSQL.
Persistem para sempre.
```

### **3. Como ver os pontos salvos?**
```javascript
// Console (F12)
const pontos = JSON.parse(localStorage.getItem('pontos_hoje') || '[]')
console.table(pontos)
```

---

## 🚀 PRÓXIMAS FUNCIONALIDADES

### **1. O que vem depois?**

Veja o **ROADMAP.md** completo em: `docs/ROADMAP.md`

**Resumo:**
```
✅ FASE 1: Reconhecimento Facial (COMPLETA!)
🔄 FASE 2: Backend Real (PRÓXIMA)
📋 FASE 3: Dashboard e Relatórios
📋 FASE 4: Gestão de Funcionários
📋 FASE 5: Multi-tenant
📋 FASE 6: Recursos Avançados
📋 FASE 7: Produção
```

### **2. Quanto tempo até ficar pronto?**
```
MVP básico: 3-4 semanas
Sistema completo: 1.5-2 meses
```

### **3. Posso usar em produção agora?**
```
✅ Para testes: SIM
❌ Para uso real: NÃO (ainda usa localStorage)

Aguarde FASE 2 (backend real) antes de usar em produção!
```

---

## 🔐 SEGURANÇA

### **1. É seguro?**

**Desenvolvimento:**
```
🟡 Parcialmente
- Dados em localStorage (não seguro para produção)
- HTTP (sem criptografia)
- CompreFace local (OK)
```

**Produção (FASE 7):**
```
🟢 Sim
- Dados em PostgreSQL
- HTTPS obrigatório
- Autenticação JWT
- Rate limiting
- CORS configurado
```

### **2. As fotos faciais são salvas?**
```
✅ SIM! No CompreFace (MinIO S3)
✅ Apenas embeddings (não imagens completas)
✅ Isoladas por empresa
```

### **3. Como são os dados faciais?**
```
CompreFace NÃO salva a foto inteira.
Salva apenas um "embedding" (vetor numérico).

Exemplo:
Foto → [0.123, 0.456, 0.789, ...] ← 512 números

Não dá para reconstruir a foto a partir do embedding!
```

---

## 📱 COMPATIBILIDADE

### **1. Funciona em celular?**
```
✅ Interface responsiva (funciona)
❌ Câmera frontal pode ter problemas
🔄 PWA em desenvolvimento (FASE 6)
```

### **2. Quais navegadores funcionam?**
```
✅ Google Chrome (recomendado)
✅ Microsoft Edge
✅ Firefox
⚠️ Safari (pode ter problemas com câmera)
❌ Internet Explorer (não suportado)
```

### **3. Funciona offline?**
```
❌ Não (ainda)
🔄 FASE 6: PWA com suporte offline
```

---

## 🆘 SUPORTE

### **Como reportar bugs?**
1. Anote o que aconteceu
2. Tire screenshot
3. Abra console (F12) e copie erros
4. Informe:
   - Navegador e versão
   - Sistema operacional
   - Passos para reproduzir

### **Logs importantes:**
```bash
# Backend
docker compose logs backend | tail -100

# Frontend
docker compose logs frontend | tail -100

# Banco
docker compose logs postgres | tail -100
```

---

**📚 MAIS DOCUMENTAÇÃO:**
- `README.md` - Início rápido
- `docs/ROADMAP.md` - Fases do projeto
- `docs/guias/LOGICA_COMPLETA_PONTO.md` - Como funciona o ponto
- `docs/progresso/CORRECAO_CRITICA_PONTO.md` - Último bug corrigido
- `docs/ESTRUTURA_PROJETO.md` - Organização do código

---

**🎊 Mais dúvidas? Consulte a documentação em `docs/`**
