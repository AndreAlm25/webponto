#!/bin/bash

# Script para criar túnel Cloudflare para testar no celular
# Uso: ./tunnel-cloudflare.sh

echo "🚀 Iniciando túnel Cloudflare..."
echo ""
echo "📱 Este túnel permite acessar o frontend no celular"
echo "🌐 Porta local: 3000 (Next.js frontend)"
echo ""

# Verificar se cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared não está instalado!"
    echo ""
    echo "📦 Instalando cloudflared..."
    
    # Detectar arquitetura
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /tmp/cloudflared
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O /tmp/cloudflared
    else
        echo "❌ Arquitetura não suportada: $ARCH"
        exit 1
    fi
    
    chmod +x /tmp/cloudflared
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
    
    echo "✅ cloudflared instalado com sucesso!"
    echo ""
fi

# Verificar se a porta 3000 está em uso
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  AVISO: Porta 3000 não está em uso!"
    echo "   Certifique-se de que o frontend está rodando:"
    echo "   cd /root/Apps/webponto/frontend && npm run dev"
    echo ""
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo "🔗 Criando túnel..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IMPORTANTE: Mantenha este terminal aberto!"
echo "  O túnel ficará ativo enquanto este script estiver rodando."
echo "  Pressione Ctrl+C para encerrar o túnel."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Criar túnel
cloudflared tunnel --url http://localhost:3000
