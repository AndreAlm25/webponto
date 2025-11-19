#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "🧪 TESTE DE LOGIN - WEBPONTO"
echo "════════════════════════════════════════════════════════════"
echo ""

# Testar localhost
echo "1️⃣ Testando LOGIN via LOCALHOST:"
echo "URL: http://localhost:4000/api/auth/login"
echo "Email: joao.silva@empresateste.com.br"
echo "Senha: senha123"
echo ""
echo "Resultado:"
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao.silva@empresateste.com.br",
    "password": "senha123"
  }' 2>/dev/null | jq '.' || echo "Erro no parse JSON"

echo ""
echo ""

# Testar IP
echo "2️⃣ Testando LOGIN via IP (192.168.18.44):"
echo "URL: http://192.168.18.44:4000/api/auth/login"
echo "Email: joao.silva@empresateste.com.br"  
echo "Senha: senha123"
echo ""
echo "Resultado:"
curl -X POST http://192.168.18.44:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao.silva@empresateste.com.br",
    "password": "senha123"
  }' 2>/dev/null | jq '.' || echo "Erro no parse JSON"

echo ""
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 VERIFICANDO DADOS NO BANCO:"
echo "════════════════════════════════════════════════════════════"
echo ""
docker exec webponto_postgres psql -U webponto -d webponto_db -c "
SELECT 
  id,
  email,
  nome,
  ativo,
  CASE 
    WHEN senha IS NULL THEN '❌ NULL'
    WHEN senha = '' THEN '❌ VAZIO'
    WHEN LENGTH(senha) < 10 THEN '⚠️  CURTO (' || LENGTH(senha) || ' chars)'
    ELSE '✅ OK (' || LENGTH(senha) || ' chars)'
  END as senha_status
FROM usuarios
ORDER BY id;
" -P pager=off

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📝 LOGS DO BACKEND (últimas 10 linhas):"
echo "════════════════════════════════════════════════════════════"
docker compose logs backend --tail 10

echo ""
echo "════════════════════════════════════════════════════════════"
