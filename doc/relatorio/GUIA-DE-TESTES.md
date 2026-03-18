# 🧪 GUIA DE TESTES COMPLETO - WEBPONTO
**Data:** 17/03/2026  
**Objetivo:** Testar todas as funcionalidades do sistema do início ao fim.

---

## 📋 PRÉ-REQUISITOS

1. Backend rodando em `http://localhost:4000`
2. Frontend rodando em `http://localhost:3000`
3. Seeds executados (banco populado)

Para iniciar tudo:
```bash
cd /root/Apps/webponto
./manage-processes.sh
```

---

## 👤 CREDENCIAIS DE TESTE

### Beta Solutions (empresa com mais cenários de férias)
| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Admin | `admin@betasolutions.com.br` | `123456*` | COMPANY_ADMIN |
| Juliana Costa | Login com slug | `123456*` | EMPLOYEE |
| (outros funcionários) | Ver seed.json | `123456*` | EMPLOYEE |

### Acme Tech
| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Admin | `admin@acmetech.com.br` | `123456*` | COMPANY_ADMIN |

---

## 🔐 TESTE 1: Autenticação

### 1.1 Login como Admin
1. Acesse `http://localhost:3000/login`
2. Digite `admin@betasolutions.com.br` / `123456*`
3. **Esperado:** Redireciona para `/admin/beta-solutions`

### 1.2 Login como Funcionário
1. Acesse `http://localhost:3000/login`
2. Login com email de um funcionário
3. **Esperado:** Redireciona para `/{slug}/{employee-slug}`

### 1.3 Logout
1. No header do admin, clique no menu do perfil (canto superior direito)
2. Clique em "Sair"
3. **Esperado:** Redireciona para `/login`

### 1.4 Proteção de rotas
1. Sem estar logado, tente acessar `http://localhost:3000/admin/beta-solutions`
2. **Esperado:** Redireciona para `/login`

---

## 🏢 TESTE 2: Painel Administrativo - Dashboard

### 2.1 Cards de estatísticas
1. Logue como admin da Beta Solutions
2. Acesse o Dashboard (página inicial do admin)
3. **Verificar:**
   - [ ] Card "Total Funcionários" mostra número correto
   - [ ] Card "Registros Hoje" funciona
   - [ ] Card "Com Reconhecimento" funciona
   - [ ] Card "Ponto Remoto" funciona

### 2.2 Sidebar
1. **Verificar todos os itens do menu:**
   - [ ] Dashboard
   - [ ] Funcionários
   - [ ] Cargos
   - [ ] Departamentos
   - [ ] Espelho de Ponto
   - [ ] Hora Extra
   - [ ] Conformidade CLT
   - [ ] Folha de Pagamento
   - [ ] Atestados
   - [ ] Férias
   - [ ] Vales
   - [ ] Mensagens
   - [ ] Alertas
   - [ ] Feriados
   - [ ] Cercas Geográficas
   - [ ] Terminal de Ponto
   - [ ] Configurações
   - [ ] Auditoria

### 2.3 Collapse do sidebar
1. Clique no botão de collapse (seta no meio da borda do sidebar)
2. **Esperado:** Sidebar colapsa para ícones apenas
3. Reabra e verifique que o estado é salvo (persiste após F5)

---

## 👥 TESTE 3: Gestão de Funcionários

### 3.1 Listar funcionários
1. Acesse `/admin/beta-solutions/funcionarios`
2. **Verificar:** Lista de funcionários aparece com nome, cargo, departamento

### 3.2 Criar funcionário
1. Clique em "Adicionar Funcionário"
2. Preencha: Nome, Email, CPF, Data de Admissão, Cargo, Salário Base
3. Salve
4. **Esperado:** Funcionário aparece na lista

### 3.3 Editar funcionário
1. Clique no funcionário desejado
2. Edite algum campo (ex: salário)
3. Salve
4. **Esperado:** Dados atualizados

### 3.4 Configurar reconhecimento facial
1. Na edição do funcionário, seção "Reconhecimento Facial"
2. Ative e cadastre o rosto
3. **Esperado:** Status muda para "Cadastrado"

### 3.5 Cargos e Departamentos
1. Acesse `/admin/beta-solutions/cargos`
2. Crie um novo cargo
3. Acesse `/admin/beta-solutions/departamentos`
4. Crie um novo departamento
5. **Esperado:** Aparecem nas listas dos funcionários

---

## ⏰ TESTE 4: Registro de Ponto

### 4.1 Ponto manual (painel do funcionário)
1. Logue como funcionário
2. Na tela principal, veja o relógio e botões de ponto
3. Clique "Registrar Entrada"
4. **Esperado:** Toast de sucesso; botão muda para próximo estado

### 4.2 Sequência completa
1. Registre ENTRADA
2. Registre INÍCIO DO INTERVALO
3. Registre FIM DO INTERVALO
4. Registre SAÍDA
5. **Esperado:** Resumo do dia aparece com horários preenchidos

### 4.3 Terminal de Ponto (admin)
1. Acesse `/admin/beta-solutions/terminal-de-ponto`
2. Selecione um funcionário
3. Registre um ponto
4. **Esperado:** Ponto registrado com sucesso

### 4.4 Verificar registros no admin
1. Acesse `/admin/beta-solutions/analises/registros`
2. Filtre por funcionário e data de hoje
3. **Esperado:** Registros aparecem corretamente

---

## 📍 TESTE 5: Cercas Geográficas

### 5.1 Criar cerca
1. Acesse `/admin/beta-solutions/cercas-geograficas`
2. Clique em "Nova Cerca"
3. Preencha nome, endereço/coordenadas e raio
4. Salve
5. **Esperado:** Cerca aparece no mapa e na lista

### 5.2 Vincular a funcionário
1. Edite um funcionário
2. No campo "Cerca Geográfica", selecione a cerca criada
3. Salve
4. **Esperado:** Funcionário vinculado à cerca

### 5.3 Testar bloqueio
1. Logue como o funcionário vinculado
2. Tente registrar ponto estando fora da área
3. **Esperado:** Mensagem de erro de localização

---

## 💰 TESTE 6: Folha de Pagamento

### 6.1 Gerar folha
1. Acesse `/admin/beta-solutions/folha-pagamento`
2. Selecione mês/ano
3. Clique em "Gerar Folha"
4. **Esperado:** Folha gerada com holerites para cada funcionário

### 6.2 Verificar cálculos do holerite
1. Clique em um funcionário na folha
2. **Verificar:**
   - [ ] Salário base correto
   - [ ] INSS calculado (tabela progressiva)
   - [ ] IRRF calculado
   - [ ] FGTS calculado (8%)
   - [ ] Benefícios descontados (VT, VR, etc.)
   - [ ] Hora extra calculada (se houver)
   - [ ] Faltas descontadas (se houver)

### 6.3 Aprovação da folha
1. Após verificar, clique em "Aprovar Folha"
2. **Esperado:** Status muda para APPROVED

### 6.4 Pagamento
1. Com a folha aprovada, clique em "Marcar como Pago"
2. **Esperado:** Status muda para PAID

### 6.5 Holerite do funcionário
1. Logue como funcionário
2. Acesse a seção de Holerite no painel
3. **Verificar:**
   - [ ] Holerite aparece
   - [ ] Valores corretos
   - [ ] Botão de assinar aparece
   - [ ] Após assinar, botão some e status muda

### 6.6 PDF do holerite
1. No painel do funcionário ou admin, clique em "Download PDF"
2. **Esperado:** PDF gerado corretamente

---

## 🏖️ TESTE 7: Férias (Fluxo Completo)

### 7.1 Solicitar férias (funcionário)
1. Logue como Juliana Costa (Beta Solutions)
2. No painel dela, role até a seção de férias
3. Clique em "Solicitar Férias" (no período disponível)
4. Preencha data de início e número de dias
5. Envie a solicitação
6. **Esperado:** Toast de sucesso; botão some

### 7.2 Admin vê solicitação (tempo real)
1. Com o painel admin aberto em outra aba
2. **Esperado:** Toast "Nova solicitação de férias recebida!" aparece automaticamente (WebSocket)
3. A solicitação aparece na seção "Aguardando Aprovação"

### 7.3 Aprovar solicitação
1. No admin, acesse `/admin/beta-solutions/ferias`
2. Na seção de solicitações pendentes, clique em "Aprovar"
3. **Esperado:** Status muda para AWAITING_SIGNATURE

### 7.4 Funcionário assina (tempo real)
1. No painel da Juliana, o modal de assinatura deve aparecer
2. Role até o fim do documento
3. Clique em "Assinar"
4. **Esperado:** Status muda para EMPLOYEE_SIGNED
5. No painel admin: toast "Funcionário assinou as férias!" aparece (WebSocket)

### 7.5 Aprovação final pelo admin
1. No admin, seção "Aguardando Aprovação Final"
2. Clique em "Aprovar Assinatura"
3. **Esperado:** Status muda para COMPLETED
4. No painel da Juliana: notificação de férias confirmadas

### 7.6 Férias vencidas
1. No admin, busque a Juliana
2. **Verificar:** Período vencido mostra badge "Vencido" + botão "Regularizar"
3. Clique em "Regularizar" e confirme
4. **Esperado:** Status muda para REGULARIZED

### 7.7 Programar férias pelo admin
1. Para um funcionário com período disponível (adquirido, não vencido)
2. Clique em "Programar"
3. Preencha as datas
4. **Esperado:** Férias criadas com status SCHEDULED

### 7.8 Contraproposta
1. Crie uma solicitação de férias como funcionário
2. No admin, em vez de aprovar, clique em "Contraproposta"
3. Sugira novas datas
4. **Esperado:** Funcionário vê a contraproposta e pode aceitar ou recusar

---

## 📊 TESTE 8: Espelho de Ponto

### 8.1 Visualizar espelho
1. Acesse `/admin/beta-solutions/espelho-ponto`
2. Selecione um funcionário e mês
3. **Verificar:**
   - [ ] Calendário com todos os dias do mês
   - [ ] Marcações de entrada/saída por dia
   - [ ] Totais calculados (horas trabalhadas, faltas, extras)

### 8.2 Exportar PDF
1. Clique em "Exportar PDF"
2. **Esperado:** PDF gerado com o espelho do mês

### 8.3 Exportar Excel
1. Clique em "Exportar Excel"
2. **Esperado:** Arquivo .xlsx baixado

---

## ⏱️ TESTE 9: Hora Extra

### 9.1 Gerar hora extra
1. Crie registros de ponto que ultrapassem o horário do funcionário
2. Acesse `/admin/beta-solutions/analises/hora-extra`
3. **Esperado:** Horas extras aparecem na lista

### 9.2 Aprovar hora extra
1. Selecione uma hora extra
2. Clique em "Aprovar"
3. **Esperado:** Status muda para APPROVED; valor aparece no holerite

---

## 💊 TESTE 10: Atestados Médicos

### 10.1 Registrar atestado
1. Acesse `/admin/beta-solutions/atestados`
2. Clique em "Novo Atestado"
3. Selecione funcionário, data e número de dias
4. Faça upload do arquivo (imagem/PDF)
5. **Esperado:** Atestado registrado; faltas do período justificadas

---

## 💬 TESTE 11: Sistema de Mensagens

### 11.1 Admin envia mensagem
1. Acesse `/admin/beta-solutions/mensagens`
2. Selecione um funcionário
3. Escreva e envie uma mensagem
4. **Esperado:** Mensagem enviada

### 11.2 Funcionário recebe
1. Logue como o funcionário destinatário
2. No painel, clique no ícone de mensagens
3. **Esperado:** Mensagem do admin aparece; badge de não lida

### 11.3 Funcionário responde
1. No painel do funcionário, responda a mensagem
2. **Esperado:** Resposta aparece no admin em tempo real (WebSocket)

---

## 🔔 TESTE 12: Alertas e Notificações

### 12.1 Alertas no admin
1. Acesse `/admin/beta-solutions/alertas`
2. **Verificar:** Alertas de conformidade, faltas, etc.

### 12.2 Dropdown de alertas no header
1. Clique no ícone de sino no header
2. **Esperado:** Lista de alertas recentes

---

## 🏖️ TESTE 13: Vales/Adiantamentos

### 13.1 Solicitar vale (funcionário)
1. No painel do funcionário, acesse seção de Vales
2. Clique em "Solicitar Vale"
3. Informe valor e motivo
4. **Esperado:** Solicitação criada

### 13.2 Aprovar vale (admin)
1. Acesse `/admin/beta-solutions/vales`
2. Aprove a solicitação
3. **Esperado:** Status muda para APPROVED; desconto aparece no holerite

---

## ⚙️ TESTE 14: Configurações da Empresa

### 14.1 Configurações gerais da empresa
1. Acesse `/admin/beta-solutions/configuracoes/empresa`
2. Edite nome fantasia, CNPJ, logo
3. Salve
4. **Esperado:** Logo atualizada no header

### 14.2 Conformidade CLT
1. Acesse `/admin/beta-solutions/configuracoes/conformidade`
2. Mude o nível para FLEXIBLE
3. **Esperado:** Alertas passam a ser avisos, não bloqueios

### 14.3 Configurações de folha
1. Acesse `/admin/beta-solutions/configuracoes/folha-pagamento`
2. Ajuste benefícios padrão
3. **Esperado:** Novos holerites usam os valores atualizados

### 14.4 Permissões
1. Acesse `/admin/beta-solutions/configuracoes/permissoes`
2. Configure permissões para o role MANAGER
3. **Esperado:** Um usuário MANAGER vê apenas o que foi permitido

---

## 📅 TESTE 15: Feriados

### 15.1 Cadastrar feriado
1. Acesse `/admin/beta-solutions/feriados`
2. Adicione um feriado (ex: 21/04 Tiradentes)
3. **Esperado:** Feriado aparece na lista e é considerado no cálculo CLT

---

## 📱 TESTE 16: Acesso no Celular

### 16.1 Via tunnel Cloudflare
```bash
cd /root/Apps/webponto
./tunnel-cloudflare.sh
```
1. O script gera uma URL pública (ex: `https://xxx.trycloudflare.com`)
2. Acesse essa URL no celular
3. **Verificar:**
   - [ ] Login funciona
   - [ ] Interface responsiva
   - [ ] Câmera funciona (precisa de HTTPS — o tunnel já fornece)
   - [ ] Registro de ponto funciona

### 16.2 Instalar como PWA
1. No Chrome do celular, acesse a URL do tunnel
2. Clique em "Adicionar à tela inicial"
3. **Esperado:** Ícone do app aparece na tela inicial

---

## 🔍 TESTE 17: Auditoria

### 17.1 Logs de auditoria
1. Realize algumas ações (criar funcionário, aprovar folha, etc.)
2. Acesse `/admin/beta-solutions/auditoria`
3. **Verificar:**
   - [ ] Ações registradas com usuário, data/hora e descrição
   - [ ] Filtros funcionam (por tipo, data, usuário)

---

## ✅ CHECKLIST FINAL PARA BETA

### Funcionalidades Core
- [ ] Login/logout funcionando
- [ ] Registro de ponto (manual) funcionando
- [ ] Reconhecimento facial funcionando
- [ ] Folha de pagamento gerando corretamente
- [ ] Holerites com assinatura digital funcionando
- [ ] Férias — fluxo completo funcionando
- [ ] WebSocket (tempo real) funcionando

### Dados
- [ ] Seeds executados corretamente
- [ ] Empresas com dados realistas para teste

### Acesso externo
- [ ] Tunnel Cloudflare funcionando (para teste mobile)
- [ ] Câmera funcionando via HTTPS

---

**Documento gerado em:** 17/03/2026
