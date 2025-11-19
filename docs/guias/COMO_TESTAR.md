# 🧪 Como Testar a Migração - Guia Passo a Passo

**Última atualização:** 20/10/2025

---

## 📋 Pré-requisitos

- ✅ Docker e Docker Compose instalados
- ✅ Node.js 20+ instalado
- ✅ Navegador moderno (Chrome/Firefox/Edge)
- ✅ Webcam disponível

---

## 🚀 Passo 1: Subir a Stack Completa

### 1.1 Navegar para o projeto
```bash
cd /root/Apps/webponto
```

### 1.2 Subir todos os serviços
```bash
docker-compose up -d
```

### 1.3 Verificar se todos subiram
```bash
docker-compose ps
```

**Você deve ver 10 containers rodando:**
- ✅ webponto_frontend
- ✅ webponto_backend
- ✅ webponto_postgres
- ✅ webponto_redis
- ✅ webponto_minio
- ✅ webponto_compreface_postgres
- ✅ webponto_compreface_core
- ✅ webponto_compreface_api
- ✅ webponto_compreface_admin
- ✅ webponto_compreface_fe

### 1.4 Verificar logs (se houver erro)
```bash
# Ver logs de todos
docker-compose logs -f

# Ver logs específicos
docker-compose logs -f compreface-api
docker-compose logs -f backend
```

---

## 🔧 Passo 2: Configurar CompreFace (PRIMEIRA VEZ)

### 2.1 Acessar interface do CompreFace
Abrir no navegador: **http://localhost:8081**

### 2.2 Criar conta de administrador
1. Clicar em "Sign Up"
2. Preencher:
   - Email: `admin@webponto.com`
   - Password: `admin123` (ou sua escolha)
3. Fazer login

### 2.3 Criar aplicação de reconhecimento
1. No dashboard, clicar em "Create Application"
2. Nome: `WebPonto`
3. Clicar em "Create"

### 2.4 Obter API Key
1. Na aplicação criada, clicar em "API Keys"
2. Copiar a API key gerada (formato UUID)
3. **GUARDAR** essa key!

### 2.5 Atualizar backend .env
```bash
cd /root/Apps/webponto/backend
nano .env  # ou seu editor favorito
```

Atualizar a linha:
```env
COMPREFACE_API_KEY={cole_aqui_a_api_key_copiada}
```

Salvar e fechar.

### 2.6 Reiniciar backend
```bash
docker-compose restart backend
```

---

## 🗄️ Passo 3: Preparar Banco de Dados

### 3.1 Rodar migrations do Prisma
```bash
cd /root/Apps/webponto/backend
npm run prisma:migrate
```

### 3.2 (Opcional) Seed de dados de teste
```bash
npm run prisma:seed
```

---

## 🖥️ Passo 4: Testar Backend (API REST)

### 4.1 Verificar saúde do backend
```bash
curl http://localhost:4000/
```

Deve retornar: `{"message":"WebPonto API running"}`

### 4.2 Testar endpoint de status
```bash
curl http://localhost:4000/pontos/facial/status/1
```

**Esperado:**
- Se não existir funcionário: `404 Not Found`
- Se existir: dados do funcionário

### 4.3 Criar funcionário de teste (via Prisma Studio)
```bash
cd backend
npx prisma studio
```

1. Abrir `http://localhost:5555`
2. Navegar para modelo `Funcionario`
3. Clicar em "Add record"
4. Preencher:
   ```
   empresaId: 1
   matricula: "0001"
   nome: "João Teste"
   cpf: "12345678900"
   dataAdmissao: (data atual)
   salarioBase: 3000.00
   faceRegistrada: false
   ativo: true
   ```
5. Salvar

---

## 🎭 Passo 5: Testar Frontend (Reconhecimento Facial)

### 5.1 Acessar a rota de reconhecimento facial
Abrir no navegador: **http://localhost:3000/ponto/facial**

### 5.2 Verificar modo Employee
URL: `http://localhost:3000/ponto/facial`

**O que deve aparecer:**
- ✅ Título "Reconhecimento Facial"
- ✅ Instruções de uso
- ✅ Botão "Reconhecer Face" (ou similar)
- ✅ Background gradiente

### 5.3 Verificar modo Admin
URL: `http://localhost:3000/ponto/facial?admin=true`

**O que deve aparecer:**
- ✅ Mesma interface
- ✅ **+** Botões "Reconhecimento" e "Cadastro"

---

## 🧪 Passo 6: Testar Fluxo de Cadastro

### 6.1 Entrar em modo Admin
`http://localhost:3000/ponto/facial?admin=true`

### 6.2 Clicar em "Cadastro"

### 6.3 Clicar no botão de câmera

**O que deve acontecer:**
1. ✅ Navegador pede permissão para câmera
2. ✅ Câmera abre em fullscreen
3. ✅ MediaPipe detecta seu rosto (borda verde)
4. ✅ Contagem regressiva de 3 segundos
5. ✅ Captura automática
6. ✅ Upload para backend
7. ✅ Toast de sucesso aparece
8. ✅ Volta para modo reconhecimento

### 6.4 Verificar no CompreFace
1. Acessar `http://localhost:8081`
2. Navegar para aplicação "WebPonto"
3. Clicar em "Subjects"
4. **Deve aparecer:** `func_1` (ou ID do funcionário)

### 6.5 Verificar no MinIO
1. Acessar `http://localhost:9001`
2. Login:
   - Username: `minioadmin`
   - Password: `minioadmin123`
3. Navegar para bucket `funcionarios`
4. **Deve ter:** `1/1/profile.jpg`

---

## 🎯 Passo 7: Testar Fluxo de Reconhecimento

### 7.1 Voltar para modo Employee
`http://localhost:3000/ponto/facial`

### 7.2 Clicar no botão de câmera

**O que deve acontecer:**
1. ✅ Câmera abre
2. ✅ Rosto detectado
3. ✅ Liveness detection (aguarda 2s estável)
4. ✅ Captura automática
5. ✅ Reconhecimento via CompreFace
6. ✅ Se similaridade >= 90%: **SUCESSO**
7. ✅ Ponto registrado no banco
8. ✅ Toast: "✅ ENTRADA registrado com sucesso!"
9. ✅ Redireciona para /dashboard

### 7.3 Verificar no banco de dados
```bash
cd backend
npx prisma studio
```

1. Abrir `http://localhost:5555`
2. Navegar para modelo `Ponto`
3. **Deve ter um registro:**
   - funcionarioId: 1
   - tipo: ENTRADA
   - timestamp: (agora)
   - reconhecimentoValido: true
   - similarity: (0.9 a 1.0)
   - fotoUrl: (path no MinIO)

### 7.4 Verificar foto no MinIO
1. Acessar `http://localhost:9001`
2. Bucket `pontos`
3. **Deve ter:** `1/1/2025-10/{timestamp}.jpg`

---

## 🐛 Troubleshooting

### Problema: "Rosto não reconhecido"

**Causas possíveis:**
1. Face não foi cadastrada
   - **Solução:** Cadastrar face primeiro (modo admin)

2. Similaridade < 90%
   - **Solução:** Melhorar iluminação, tentar novamente

3. API key do CompreFace inválida
   - **Solução:** Verificar `.env` do backend

### Problema: "Câmera não abre"

**Causas possíveis:**
1. Navegador não tem permissão
   - **Solução:** Permitir acesso à câmera

2. HTTPS necessário (em alguns navegadores)
   - **Solução:** Usar localhost (não precisa HTTPS)

3. Câmera em uso por outro app
   - **Solução:** Fechar outros apps que usam câmera

### Problema: "Upload falhou"

**Causas possíveis:**
1. MinIO não está rodando
   - **Solução:** `docker-compose up -d minio`

2. Bucket não foi criado
   - **Solução:** MinioService cria automaticamente na primeira vez

3. Backend não consegue conectar no MinIO
   - **Solução:** Verificar rede Docker

### Problema: "CompreFace erro 500"

**Causas possíveis:**
1. Modelos ML não carregaram
   - **Solução:** Aguardar ~2 minutos após subir stack

2. Memória insuficiente
   - **Solução:** CompreFace precisa ~2GB RAM mínimo

3. PostgreSQL do CompreFace não iniciou
   - **Solução:** `docker-compose logs compreface-postgres-db`

---

## 📊 Checklist de Validação

### Infraestrutura
- [ ] Todos os 10 containers rodando
- [ ] CompreFace UI acessível (localhost:8081)
- [ ] MinIO console acessível (localhost:9001)
- [ ] Backend API respondendo (localhost:4000)
- [ ] Frontend rodando (localhost:3000)

### Backend
- [ ] MinioService funcional
- [ ] ComprefaceService funcional
- [ ] Endpoints REST respondendo
- [ ] Prisma conectando no PostgreSQL
- [ ] Logs sem erros críticos

### Frontend
- [ ] Rota /ponto/facial acessível
- [ ] Componentes renderizando
- [ ] Câmera abrindo
- [ ] MediaPipe detectando rosto
- [ ] Toast Sonner funcionando

### Fluxo Completo
- [ ] Cadastro de face OK
- [ ] Subject criado no CompreFace
- [ ] Foto salva no MinIO (bucket funcionarios)
- [ ] Reconhecimento facial OK
- [ ] Ponto registrado no PostgreSQL
- [ ] Foto do ponto salva no MinIO (bucket pontos)
- [ ] Tipo de ponto determinado corretamente

---

## 🎉 Sucesso!

Se todos os itens do checklist estão ✅, a migração está **100% funcional!**

### Próximos Passos:
1. Implementar autenticação JWT
2. Adicionar mais funcionários de teste
3. Testar sequência completa de pontos (entrada → intervalo → saída)
4. Testar modo offline
5. Testes de performance

---

## 📞 Suporte

**Problemas?** Verifique:
1. Logs: `docker-compose logs -f`
2. PROGRESSO.md para status atual
3. MIGRACAO_EXECUTADA.md para detalhes técnicos

**Dúvidas técnicas:**
- Consulte `/docs/RECONHECIMENTO_FACIAL_DETALHADO.md`
- Consulte `/docs/COMPONENTE_FACIAL_GUIA.md`
