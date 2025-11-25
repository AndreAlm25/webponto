# 🌐 Túnel Cloudflare - Testar no Celular

## 📱 O que é?

O túnel Cloudflare permite acessar o frontend rodando no seu servidor (localhost:3000) através de uma URL pública temporária, possibilitando testes no celular.

---

## 🚀 Como Usar

### **Passo 1: Iniciar o Frontend**

Certifique-se de que o frontend está rodando:

```bash
cd /root/Apps/webponto/frontend
npm run dev
```

O frontend deve estar rodando em `http://localhost:3000`

---

### **Passo 2: Iniciar o Túnel**

Execute o script:

```bash
cd /root/Apps/webponto
./tunnel-cloudflare.sh
```

Ou diretamente:

```bash
bash /root/Apps/webponto/tunnel-cloudflare.sh
```

---

### **Passo 3: Copiar a URL**

O script vai exibir algo como:

```
🔗 Criando túnel...

2025-11-24T19:00:00Z INF +--------------------------------------------------------------------------------------------+
2025-11-24T19:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2025-11-24T19:00:00Z INF |  https://passport-watershed-xml-angels.trycloudflare.com                                   |
2025-11-24T19:00:00Z INF +--------------------------------------------------------------------------------------------+
```

**Copie a URL** (ex: `https://passport-watershed-xml-angels.trycloudflare.com`)

---

### **Passo 4: Acessar no Celular**

1. Abra o navegador do celular
2. Cole a URL copiada
3. ✅ Pronto! Você está acessando o frontend

---

## ⚠️ IMPORTANTE

### **Mantenha o Terminal Aberto**
- O túnel fica ativo enquanto o script estiver rodando
- **NÃO FECHE** o terminal
- Para encerrar: pressione `Ctrl+C`

### **URL Temporária**
- A URL muda **toda vez** que você reinicia o túnel
- Exemplo: `https://abc-xyz-123.trycloudflare.com`
- Válida apenas enquanto o túnel estiver ativo

### **Segurança**
- ⚠️ Qualquer pessoa com a URL pode acessar
- ⚠️ Use apenas para testes
- ⚠️ Não compartilhe a URL publicamente
- ✅ Encerre o túnel quando terminar os testes

---

## 🔧 Solução de Problemas

### **Erro: Porta 3000 não está em uso**

**Causa:** Frontend não está rodando

**Solução:**
```bash
cd /root/Apps/webponto/frontend
npm run dev
```

---

### **Erro: cloudflared não encontrado**

**Causa:** cloudflared não está instalado

**Solução:** O script instala automaticamente, mas se falhar:

```bash
# Instalar manualmente
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

---

### **Túnel não conecta**

**Soluções:**
1. Verificar se o frontend está rodando: `lsof -i :3000`
2. Reiniciar o túnel: `Ctrl+C` e executar novamente
3. Verificar conexão com internet

---

## 📝 Exemplo Completo

```bash
# Terminal 1: Frontend
cd /root/Apps/webponto/frontend
npm run dev

# Terminal 2: Túnel
cd /root/Apps/webponto
./tunnel-cloudflare.sh

# Copiar URL e acessar no celular
# Ex: https://abc-xyz-123.trycloudflare.com
```

---

## 🎯 Casos de Uso

### **Testar Reconhecimento Facial**
- Acessar pelo celular
- Usar câmera do celular
- Testar cadastro e reconhecimento

### **Testar Geolocalização**
- Acessar pelo celular
- Permitir acesso à localização
- Testar ponto remoto com cerca geográfica

### **Testar Responsividade**
- Verificar layout mobile
- Testar touch/gestos
- Validar UX no celular

---

## 🔗 Links Úteis

- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Documentação:** https://github.com/cloudflare/cloudflared

---

## 💡 Dicas

1. **Múltiplos Túneis:** Você pode criar túneis para diferentes portas
   ```bash
   cloudflared tunnel --url http://localhost:4000  # Backend
   ```

2. **Logs:** O túnel mostra logs em tempo real de todas as requisições

3. **Performance:** Pode haver latência devido ao túnel, é normal

4. **Alternativas:** 
   - ngrok: `ngrok http 3000`
   - localtunnel: `lt --port 3000`

---

**Pronto para testar! 🚀📱**
