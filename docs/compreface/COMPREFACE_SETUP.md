# 🎯 GUIA COMPLETO: CONFIGURAR COMPREFACE

**Data:** 20/10/2025 - 13:45  
**Status:** ✅ CompreFace rodando na porta 8000

---

## 🌐 ACESSO AO COMPREFACE

**URL:** http://localhost:8000

**Status:** ✅ FUNCIONANDO

---

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ PRIMEIRO ACESSO

**Abrir no navegador:**
```
http://localhost:8000
```

**Você verá a tela de login do CompreFace**

---

### 2️⃣ CRIAR CONTA DE ADMINISTRADOR

**Na tela inicial:**

1. Clique em **"Sign Up"** (Cadastrar) no canto superior direito
2. Preencha o formulário:
   ```
   Username: admin
   Email: admin@webponto.com
   Password: admin123
   Confirm Password: admin123
   ```
3. Clique em **"Sign Up"**
4. ✅ Conta criada!

**Nota:** Se a conta já existe, apenas faça login com as credenciais acima.

---

### 3️⃣ FAZER LOGIN

**Após criar a conta:**

1. Será redirecionado para a tela de login
2. Digite:
   ```
   Email: admin@webponto.com
   Password: admin123
   ```
3. Clique em **"Sign In"**
4. ✅ Você está dentro!

---

### 4️⃣ CRIAR APPLICATION (APLICAÇÃO)

**No dashboard principal:**

1. Você verá uma tela com **"Applications"**
2. Clique no botão **"+ Create"** ou **"Create Application"**
3. Preencha:
   ```
   Name: WebPonto
   ```
4. Clique em **"Create"** ou **"Save"**
5. ✅ Application "WebPonto" criada!

**Você será redirecionado para a página da aplicação.**

---

### 5️⃣ CRIAR RECOGNITION SERVICE

**Dentro da Application "WebPonto":**

1. Você verá a seção **"Services"**
2. Clique em **"+ Add Service"** ou **"Create Service"**
3. Preencha:
   ```
   Service Type: Recognition Service
   Name: Face Recognition
   ```
4. Clique em **"Create"** ou **"Add"**
5. ✅ Recognition Service criado!

---

### 6️⃣ COPIAR API KEY

**No Recognition Service criado:**

1. Você verá a **API Key** exibida
2. Formato: `00000000-0000-0000-0000-000000000002`
3. **COPIE ESTA API KEY!**
4. Ela será parecida com:
   ```
   a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

**IMPORTANTE:** Esta API Key é única e será usada no backend!

---

### 7️⃣ ATUALIZAR VARIÁVEIS DE AMBIENTE

**Edite o arquivo de ambiente:**

#### Backend (.env ou docker-compose.yml):
```env
COMPREFACE_API_URL=http://compreface-api:8080
COMPREFACE_API_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890  # ← COLE SUA API KEY AQUI
COMPREFACE_THRESHOLD=0.85
COMPREFACE_DET_PROB=0.2
```

#### Frontend (.env.local - se necessário):
```env
NEXT_PUBLIC_COMPREFACE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_COMPREFACE_API_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890  # ← COLE SUA API KEY AQUI
```

---

### 8️⃣ REINICIAR CONTAINERS (SE ALTEROU .ENV)

**Se você atualizou variáveis de ambiente:**

```bash
cd /root/Apps/webponto
docker compose restart backend frontend
```

**Aguarde ~30 segundos para os containers reiniciarem.**

---

## 🧪 TESTAR A CONFIGURAÇÃO

### Teste 1: Verificar API
```bash
curl -X GET "http://localhost:8080/api/v1/recognition/subjects" \
  -H "x-api-key: SUA_API_KEY_AQUI"
```

**Resultado esperado:**
```json
{"subjects":[]}
```

---

### Teste 2: Cadastrar Face (via UI WebPonto)

1. Acesse: http://localhost:3000
2. Login: joao.silva@empresateste.com.br / senha123
3. Dashboard → Registrar Ponto
4. Modo CADASTRO aparece
5. Iniciar Câmera
6. Posicionar rosto
7. ✅ Face cadastrada!

---

### Teste 3: Verificar Face Cadastrada

**No CompreFace Admin (http://localhost:8000):**

1. Entre na Application "WebPonto"
2. Entre no Recognition Service
3. Clique em **"Subjects"** ou **"View Subjects"**
4. Você verá o email do João cadastrado!

---

## 🎯 RESUMO DAS PORTAS

```
┌─────────────────────────────────────────┐
│ COMPREFACE PORTAS                       │
├─────────────────────────────────────────┤
│ Admin UI:  http://localhost:8000        │ ← Interface Web
│ API:       http://localhost:8080        │ ← API Externa
│ Internal:  http://compreface-api:8080   │ ← Dentro do Docker
└─────────────────────────────────────────┘
```

---

## 📊 ESTRUTURA DO COMPREFACE

```
CompreFace
├── Application: WebPonto
│   ├── Recognition Service: Face Recognition
│   │   ├── API Key: xxxx-xxxx-xxxx-xxxx
│   │   ├── Subjects: [emails dos funcionários]
│   │   └── Faces: [fotos cadastradas]
│   └── (outros serviços se necessário)
└── Admin Account: admin@webponto.com
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: "Connection Refused" na porta 8000

**Solução:**
```bash
docker compose ps | grep compreface-fe
```

Verificar se o container está rodando. Se não:
```bash
docker compose up -d compreface-fe
```

---

### Problema 2: API Key não funciona

**Verificar:**
1. API Key está correta (sem espaços)
2. Recognition Service foi criado (não Verification)
3. Reiniciou os containers após alterar .env

---

### Problema 3: Face não cadastra

**Verificar logs:**
```bash
docker compose logs compreface-api -f
```

**Verificar conectividade:**
```bash
curl http://localhost:8080/api/v1/recognition/faces
```

---

### Problema 4: Porta 8000 já em uso

**Verificar qual processo está usando:**
```bash
lsof -i :8000
```

**Parar e reiniciar:**
```bash
docker compose restart compreface-fe
```

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

- [ ] Acessar http://localhost:8000
- [ ] Criar conta admin
- [ ] Fazer login
- [ ] Criar Application "WebPonto"
- [ ] Criar Recognition Service "Face Recognition"
- [ ] Copiar API Key
- [ ] Atualizar variáveis de ambiente (backend)
- [ ] Reiniciar containers (se necessário)
- [ ] Testar cadastro de face na UI
- [ ] Verificar subject no CompreFace Admin

---

## 🎊 PRONTO!

Após seguir todos os passos:

✅ CompreFace configurado  
✅ API Key gerada  
✅ Recognition Service criado  
✅ Sistema pronto para usar reconhecimento facial  

---

## 📝 CONFIGURAÇÃO ATUAL

**docker-compose.yml:**
```yaml
compreface-fe:
  ports:
    - "8000:80"  # Admin UI

compreface-api:
  ports:
    - "8080:8080"  # API
  environment:
    POSTGRES_URL: jdbc:postgresql://compreface-postgres-db:5432/frs
```

**Backend (.env):**
```env
COMPREFACE_API_URL=http://compreface-api:8080
COMPREFACE_API_KEY=00000000-0000-0000-0000-000000000002
```

---

## 🔗 LINKS ÚTEIS

- **Admin UI:** http://localhost:8000
- **API Endpoint:** http://localhost:8080/api/v1
- **Documentação:** https://github.com/exadel-inc/CompreFace
- **Swagger API:** http://localhost:8080/swagger-ui.html

---

**🎉 BOM TRABALHO!**

**Agora você pode configurar o CompreFace e usar reconhecimento facial no WebPonto! 🚀**
