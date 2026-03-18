#!/bin/bash

# Script para criar dois túneis Cloudflare (frontend + backend)
# Uso: ./tunnel-cloudflare-full.sh

set -e

echo "🚀 Iniciando túneis Cloudflare (Frontend + Backend)..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar se cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared não está instalado!${NC}"
    echo "Instale com: wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared"
    exit 1
fi

# Verificar se as portas estão em uso
check_port() {
    local port=$1
    local name=$2
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  AVISO: Porta $port não está em uso!${NC}"
        echo "   Certifique-se de que o $name está rodando:"
        if [ "$port" = "3000" ]; then
            echo "   cd /root/Apps/webponto/frontend && npm run dev"
        else
            echo "   cd /root/Apps/webponto/backend && npm run start:dev"
        fi
        echo ""
        read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
}

check_port 3000 "frontend"
check_port 4000 "backend"

# Criar diretório temporário para logs
TMPDIR=$(mktemp -d)
FRONTEND_LOG="$TMPDIR/frontend.log"
BACKEND_LOG="$TMPDIR/backend.log"

# Função para limpar ao sair
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Encerrando túneis...${NC}"
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
    rm -rf $TMPDIR
    echo -e "${GREEN}✓ Túneis encerrados${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}🔗 Criando túnel para FRONTEND (porta 3000)...${NC}"
cloudflared tunnel --url http://localhost:3000 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo -e "${CYAN}🔗 Criando túnel para BACKEND (porta 4000)...${NC}"
cloudflared tunnel --url http://localhost:4000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo ""
echo -e "${YELLOW}⏳ Aguardando túneis ficarem prontos (10-15 segundos)...${NC}"
sleep 12

# Extrair URLs dos logs
FRONTEND_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$FRONTEND_LOG" | head -1)
BACKEND_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$BACKEND_LOG" | head -1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ TÚNEIS CRIADOS COM SUCESSO!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "🌐 ${CYAN}FRONTEND (Next.js):${NC}"
echo "   $FRONTEND_URL"
echo ""
echo -e "🔌 ${CYAN}BACKEND (API):${NC}"
echo "   $BACKEND_URL"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   O frontend está configurado para usar localhost:4000"
echo "   Para funcionar no celular/tablet, precisa configurar"
echo "   o frontend para usar o backend externo."
echo ""
echo -e "${YELLOW}💡 Opções:${NC}"
echo "   1. Modificar .env.local do frontend com:"
echo "      NEXT_PUBLIC_API_URL=$BACKEND_URL"
echo "      NEXT_PUBLIC_WS_URL=${BACKEND_URL/https:/wss:}"
echo "      (precisa reiniciar o frontend)"
echo ""
echo "   2. Ou usar a URL local se estiver na mesma rede Wi-Fi:"
echo "      http://192.168.18.44:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pressione Ctrl+C para encerrar os túneis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Aguardar
wait $FRONTEND_PID $BACKEND_PID
