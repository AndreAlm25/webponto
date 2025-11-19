# 📘 GUIA PARA INICIANTES - WebPonto

**Bem-vindo!** Este guia é para você que **não é programador** e quer entender o projeto passo a passo.

---

## 🎯 Como Este Projeto Funciona

Vamos trabalhar **fase por fase**:
1. ✅ **Implementar** algo no backend
2. ✅ **Implementar** a mesma coisa no frontend  
3. ✅ **Testar** (você vai validar se está funcionando)
4. ✅ **Próxima fase** (só depois que você aprovar!)

---

## 🚀 PASSO 1: Iniciar o Projeto

### No terminal, digite:

```bash
cd /root/Apps/webponto
./iniciar.sh
```

**O que vai acontecer:**
- O Docker vai baixar e iniciar 10 serviços
- Vai demorar uns 2-3 minutos na primeira vez
- Quando terminar, mostra: "✅ Projeto iniciado!"

### Ver se está tudo rodando:

```bash
./status.sh
```

**O que procurar:**
- Se aparecer **"Up"** = Está funcionando ✅
- Se aparecer **"Exit"** = Deu erro ❌

### Ver os logs (opcional):

```bash
./ver-logs.sh
```

Pressione **Ctrl+C** para sair.

---

## 🧪 PASSO 2: Testar a FASE 1

### O que foi implementado na Fase 1:

**Backend (parte invisível):**
- Sistema para guardar fotos (MinIO)
- Sistema de reconhecimento facial (CompreFace)
- 4 rotas da API para o ponto eletrônico

**Frontend (parte visual):**
- Tela de cadastro de rosto
- Tela de reconhecimento facial
- Câmera funcionando

### Como testar:

#### A) Abrir no navegador:
```
http://localhost:3000/ponto/facial?admin=true
```

#### B) O que você deve ver:
- ✅ Uma tela bonita com fundo gradiente
- ✅ Um botão para abrir a câmera
- ✅ Instruções de uso

#### C) Testar cadastro:
1. Clique no botão
2. Permita acesso à câmera (vai pedir permissão)
3. Posicione seu rosto na frente da câmera
4. Aguarde 3 segundos
5. **Deve aparecer**: "✅ Face cadastrada com sucesso!"

#### D) Testar reconhecimento:
1. Volte para a tela
2. Clique novamente no botão
3. Mostre seu rosto
4. **Deve aparecer**: "✅ ENTRADA registrado com sucesso!"

---

## ✅ CHECKLIST DA FASE 1

Marque o que você conseguiu fazer:

- [ ] Consegui rodar `./iniciar.sh` sem erros
- [ ] Todos os serviços aparecem como "Up" no `./status.sh`
- [ ] Consegui abrir http://localhost:3000/ponto/facial?admin=true
- [ ] A câmera abriu quando cliquei no botão
- [ ] Consegui cadastrar minha face
- [ ] Consegui fazer reconhecimento facial
- [ ] Apareceu a mensagem de sucesso

**Se marcou TUDO ✅:** A Fase 1 está OK! Pode avisar para irmos para a Fase 2.

**Se algo deu ❌:** Veja a seção "Problemas Comuns" abaixo.

---

## 🐛 Problemas Comuns

### Problema 1: "docker-compose: comando não encontrado"
**Solução:** ✅ CORRIGIDO! Use os scripts: `./iniciar.sh`

### Problema 2: Backend travando ou em loop
**Solução:** ✅ CORRIGIDO! O volume do Docker foi ajustado.

Se ainda aparecer erro:
```bash
./parar.sh
rm -rf backend/dist
./iniciar.sh
```

### Problema 3: Algum serviço aparece como "Exit"
**Solução:**
```bash
# Ver qual serviço deu erro
./status.sh

# Ver o erro específico
./ver-logs.sh
```

### Problema 4: Câmera não abre
**Causas:**
- Navegador não tem permissão → Clique em "Permitir" quando pedir
- Câmera sendo usada por outro app → Feche outros apps

### Problema 5: "Rosto não reconhecido"
**Causas:**
- Você ainda não cadastrou sua face → Cadastre primeiro
- Pouca luz → Melhore a iluminação
- Rosto muito longe/perto → Ajuste a distância

---

## 📊 O QUE EXISTE AGORA (FASE 1)

### Backend (Invisível para você)
```
✅ MinioService        - Guarda fotos
✅ ComprefaceService   - Reconhece rostos
✅ PontosModule        - Registra pontos

Rotas da API:
✅ POST /pontos/facial           - Bater ponto com rosto
✅ POST /pontos/facial/cadastro  - Cadastrar rosto
✅ GET /pontos/facial/status/:id - Ver status
✅ GET /pontos/:id               - Ver histórico
```

### Frontend (Visível para você)
```
✅ Página: /ponto/facial
   - Modo Admin (cadastro + reconhecimento)
   - Modo Funcionário (só reconhecimento)
   
✅ Componentes:
   - Câmera com detecção de rosto
   - Liveness detection (anti-fraude)
   - Notificações bonitas
```

### Banco de Dados
```
✅ Tabela: Funcionario
   - Campos: nome, cpf, faceId, faceRegistrada
   
✅ Tabela: Ponto
   - Campos: timestamp, tipo, foto, similarity
```

---

## 📅 PRÓXIMAS FASES

### 🔐 Fase 2: Login e Autenticação (Dias 8-10)
**O que vai ter:**
- Tela de login
- Tela de cadastro
- Sistema de permissões (admin, RH, funcionário)

**Como vou testar:**
- Criar uma conta
- Fazer login
- Acessar área restrita

### 💾 Fase 3: Modo Offline (Dias 11-17)
**O que vai ter:**
- Bater ponto sem internet
- Sincronizar quando voltar online
- Avisos em tempo real (WebSocket)

**Como vou testar:**
- Desligar WiFi
- Bater ponto
- Ligar WiFi
- Ver se sincronizou

### 👨‍💼 Fase 4: RH e Folha (Dias 18-24)
**O que vai ter:**
- Cadastro de funcionários
- Cálculo de horas
- Folha de pagamento
- Relatórios

**Como vou testar:**
- Cadastrar funcionário
- Ver relatório de horas
- Calcular salário

### 💰 Fase 5: Financeiro (Dias 25-30)
**O que vai ter:**
- Controle de receitas/despesas
- Fluxo de caixa
- Relatórios financeiros

**Como vou testar:**
- Lançar uma despesa
- Ver fluxo de caixa
- Exportar relatório

### 🚀 Fase 6: Finalização (Dias 31-35)
**O que vai ter:**
- Testes finais
- Landing page
- Deploy (colocar online)

---

## 🛠️ Comandos Úteis (Cola)

```bash
# Iniciar o projeto
./iniciar.sh

# Ver status
./status.sh

# Ver logs
./ver-logs.sh

# Parar tudo
./parar.sh

# Acessar frontend
# Abrir navegador: http://localhost:3000/ponto/facial?admin=true

# Acessar CompreFace Admin (OPCIONAL - só para conhecer)
# Abrir navegador: http://localhost:8000

# Acessar banco de dados visual
cd backend
npm run prisma:studio
# Abrir navegador: http://localhost:5555
```

---

## 📞 Quando Avisar Que Terminou?

**Depois que você:**
1. ✅ Testou tudo da Fase 1
2. ✅ Marcou todos os itens do checklist
3. ✅ Está funcionando do jeito que você quer

**Aí você avisa:** "Fase 1 OK, pode ir para Fase 2!"

---

## 💡 Dicas Importantes

### Para Não Se Perder:
- Leia **SÓ ESTE ARQUIVO** por enquanto
- Ignore os outros documentos técnicos (são para programadores)
- Siga fase por fase, sem pular

### Para Testar Bem:
- Teste tudo sozinho primeiro
- Anote o que funcionou ✅
- Anote o que deu erro ❌
- Me avise os erros para eu corrigir

### Para Aprender:
- Cada fase vai ficando mais clara
- Não precisa entender o código
- Foque em "o que faz" não "como faz"

---

## 📝 RESUMO DA FASE 1 (Versão Simples)

**O que foi feito:**
1. Sistema de reconhecimento facial instalado
2. Tela para cadastrar rosto
3. Tela para bater ponto com rosto
4. Tudo rodando no seu computador

**O que você precisa testar:**
1. Cadastrar seu rosto
2. Fazer reconhecimento facial
3. Ver se aparece mensagem de sucesso

**Se funcionar:**
→ Fase 1 ✅ Completa!
→ Próxima: Fase 2 (Login)

**Se não funcionar:**
→ Me avise os erros
→ Eu corrijo
→ Você testa de novo

---

**Lembre-se:** Vamos devagar, uma fase por vez! 🐢✨

**Próximo passo:** Rode `./iniciar.sh` e teste tudo! Depois me avise o resultado.
